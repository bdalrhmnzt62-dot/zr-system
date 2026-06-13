import { openDB, type DBSchema } from "idb";
import { supabase } from "@/integrations/supabase/client";

type OfflineTable = "expenses" | "work_orders" | "invoices";
type SyncOperation = "insert" | "update" | "delete";

interface CachedCollection {
  key: string;
  rows: Record<string, unknown>[];
  updatedAt: number;
}

interface PendingMutation {
  id: string;
  table: OfflineTable;
  operation: SyncOperation;
  rowId: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

interface ZrOfflineDb extends DBSchema {
  collections: { key: string; value: CachedCollection };
  pending: { key: string; value: PendingMutation; indexes: { "by-created": number } };
  meta: { key: string; value: { key: string; value: string } };
}

const dbPromise =
  typeof window === "undefined"
    ? null
    : openDB<ZrOfflineDb>("zr-system-offline", 1, {
        upgrade(db) {
          db.createObjectStore("collections", { keyPath: "key" });
          const pending = db.createObjectStore("pending", { keyPath: "id" });
          pending.createIndex("by-created", "createdAt");
          db.createObjectStore("meta", { keyPath: "key" });
        },
      });

const collectionKey = (table: OfflineTable) => `table:${table}`;

export async function rememberOwnerId(ownerId: string) {
  const db = await dbPromise;
  if (db) await db.put("meta", { key: "owner_id", value: ownerId });
}

export async function getRememberedOwnerId() {
  const db = await dbPromise;
  return (await db?.get("meta", "owner_id"))?.value ?? null;
}

export async function cacheRows(table: OfflineTable, rows: Record<string, unknown>[]) {
  const db = await dbPromise;
  if (db) await db.put("collections", { key: collectionKey(table), rows, updatedAt: Date.now() });
}

export async function readCachedRows(table: OfflineTable) {
  const db = await dbPromise;
  return (await db?.get("collections", collectionKey(table)))?.rows ?? [];
}

async function patchLocal(
  table: OfflineTable,
  rowId: string,
  payload: Record<string, unknown>,
  remove = false,
) {
  const rows = await readCachedRows(table);
  const next = remove
    ? rows.filter((row) => row.id !== rowId)
    : rows.some((row) => row.id === rowId)
      ? rows.map((row) => (row.id === rowId ? { ...row, ...payload, sync_status: "pending" } : row))
      : [{ ...payload, id: rowId, sync_status: "pending" }, ...rows];
  await cacheRows(table, next);
}

async function queueMutation(mutation: PendingMutation) {
  const db = await dbPromise;
  if (db) await db.put("pending", mutation);
}

export async function offlineUpsert(
  table: OfflineTable,
  payload: Record<string, unknown>,
  rowId?: string,
) {
  const id = rowId ?? crypto.randomUUID();
  const fullPayload = { ...payload, id };
  await patchLocal(table, id, fullPayload);
  await queueMutation({
    id: crypto.randomUUID(),
    table,
    operation: rowId ? "update" : "insert",
    rowId: id,
    payload: fullPayload,
    createdAt: Date.now(),
  });
  if (navigator.onLine) await syncPendingMutations();
  return fullPayload;
}

export async function offlineDelete(table: OfflineTable, rowId: string) {
  await patchLocal(table, rowId, {}, true);
  await queueMutation({
    id: crypto.randomUUID(),
    table,
    operation: "delete",
    rowId,
    payload: {},
    createdAt: Date.now(),
  });
  if (navigator.onLine) await syncPendingMutations();
}

export async function syncPendingMutations() {
  if (typeof navigator === "undefined" || !navigator.onLine) return { synced: 0 };
  const db = await dbPromise;
  if (!db) return { synced: 0 };
  const pending = await db.getAllFromIndex("pending", "by-created");
  let synced = 0;
  for (const mutation of pending) {
    const query = mutation.operation === "delete"
      ? supabase.from(mutation.table).delete().eq("id", mutation.rowId)
      : mutation.operation === "update"
        ? supabase.from(mutation.table).update(mutation.payload as never).eq("id", mutation.rowId)
        : supabase.from(mutation.table).insert(mutation.payload as never);
    const { error } = await query;
    if (error) break;
    await db.delete("pending", mutation.id);
    synced += 1;
  }
  return { synced };
}

export async function fetchWithOfflineCache(
  table: OfflineTable,
  onlineFetch: () => Promise<Record<string, unknown>[]>,
) {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      await syncPendingMutations();
      const rows = await onlineFetch();
      await cacheRows(table, rows);
      return rows;
    } catch {
      return readCachedRows(table);
    }
  }
  return readCachedRows(table);
}

export function startAutomaticSync(onSynced?: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const sync = () =>
    void syncPendingMutations().then(({ synced }) => {
      if (synced > 0) onSynced?.();
    });
  window.addEventListener("online", sync);
  const timer = window.setInterval(sync, 30_000);
  sync();
  return () => {
    window.removeEventListener("online", sync);
    window.clearInterval(timer);
  };
}

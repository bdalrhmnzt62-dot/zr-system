import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("غير مصرح");
}

function genKey(): string {
  const a = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ZR-${a()}-${a()}-${a()}`;
}

export const listLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("license_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CreateLicenseSchema = z.object({
  client_name: z.string().trim().min(1).max(120),
  duration_days: z.number().int().min(1).max(3650).default(30),
  notes: z.string().trim().max(500).optional(),
});

export const createLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateLicenseSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("license_keys")
      .insert({
        key: genKey(),
        client_name: data.client_name,
        duration_days: data.duration_days,
        notes: data.notes ?? null,
        status: "pending",
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const UpdateLicenseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "active", "expired", "revoked"]).optional(),
  duration_days: z.number().int().min(1).max(3650).optional(),
  client_name: z.string().trim().min(1).max(120).optional(),
});

export const updateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateLicenseSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { data: row, error } = await supabaseAdmin
      .from("license_keys")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const DeleteLicenseSchema = z.object({ id: z.string().uuid() });

const RenewLicenseSchema = z
  .object({
    id: z.string().uuid(),
    add_days: z.number().int().min(1).max(3650).optional(),
    expires_at: z.string().datetime().optional(),
  })
  .refine(
    (value) => value.add_days !== undefined || value.expires_at !== undefined,
    "حدد مدة التجديد",
  );

export const renewLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RenewLicenseSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: currentError } = await supabaseAdmin
      .from("license_keys")
      .select("*")
      .eq("id", data.id)
      .single();
    if (currentError || !current) throw new Error("الكود غير موجود");
    const base =
      current.expires_at && new Date(current.expires_at).getTime() > Date.now()
        ? new Date(current.expires_at)
        : new Date();
    const expiresAt = data.expires_at
      ? new Date(data.expires_at)
      : new Date(base.getTime() + Number(data.add_days) * 86_400_000);
    if (expiresAt.getTime() <= Date.now())
      throw new Error("تاريخ الانتهاء الجديد يجب أن يكون في المستقبل");
    const activatedStatus = current.activated_by ? "active" : "pending";
    const { data: row, error } = await supabaseAdmin
      .from("license_keys")
      .update({
        expires_at: expiresAt.toISOString(),
        duration_days: Math.max(
          1,
          Math.ceil(
            (expiresAt.getTime() - new Date(current.activated_at ?? Date.now()).getTime()) /
              86_400_000,
          ),
        ),
        status: activatedStatus,
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteLicenseSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("license_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [licenses, customers, invoices] = await Promise.all([
      supabaseAdmin.from("license_keys").select("status", { count: "exact" }),
      supabaseAdmin.from("customers").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("invoices").select("total"),
    ]);

    const byStatus: Record<string, number> = { pending: 0, active: 0, expired: 0, revoked: 0 };
    (licenses.data ?? []).forEach((l) => {
      byStatus[l.status as string] = (byStatus[l.status as string] ?? 0) + 1;
    });

    const totalRevenue = (invoices.data ?? []).reduce(
      (s: number, r: { total: number | string }) => s + Number(r.total || 0),
      0,
    );

    return {
      totalLicenses: licenses.count ?? 0,
      byStatus,
      totalCustomers: customers.count ?? 0,
      totalRevenue,
    };
  });

const PromoteAdminSchema = z.object({ secret: z.string() });

// One-time bootstrap: anyone holding the public env-stored bootstrap secret can promote themselves.
// In production the admin replaces ADMIN_BOOTSTRAP_SECRET and removes/rotates it.
export const promoteSelfAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PromoteAdminSchema.parse(d))
  .handler(async ({ data, context }) => {
    const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected) throw new Error("تم إغلاق إعداد المسؤول الأول لأسباب أمنية");
    if (data.secret !== expected) throw new Error("الرمز السري غير صحيح");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return { roles: (data ?? []).map((r) => r.role as string) };
  });

const AdminSettingsSchema = z.object({
  system_name: z.string().trim().min(1).max(120),
  currency: z.string().trim().min(1).max(12),
  auto_sync: z.boolean(),
  inventory_alerts: z.boolean(),
});

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_settings")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? { system_name: "ZR System", currency: "ج.م", auto_sync: true, inventory_alerts: true }
    );
  });

export const saveAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AdminSettingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Stable client install identifier + local license cache + anti-date-rollback guard.
const STORAGE_KEY = "zr_install_id";
const LICENSE_KEY = "zr_license";
const HEARTBEAT_KEY = "zr_last_seen_ts";
const TAMPER_KEY = "zr_tampered";

export function getInstallId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export interface CachedLicense {
  key: string;
  client_name: string;
  expires_at: string | null;
  activated_at: string;
}

export function cacheLicense(lic: CachedLicense) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LICENSE_KEY, JSON.stringify(lic));
  // Initialise heartbeat at activation time
  localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
  localStorage.removeItem(TAMPER_KEY);
}

export function readCachedLicense(): CachedLicense | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LICENSE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearCachedLicense() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LICENSE_KEY);
  localStorage.removeItem(HEARTBEAT_KEY);
}

// --- Anti date-manipulation ---
// Tolerance for legitimate clock drift / NTP sync (10 minutes)
const ROLLBACK_TOLERANCE_MS = 10 * 60 * 1000;

export type LicenseValidation =
  | { ok: true; license: CachedLicense }
  | { ok: false; reason: "missing" | "expired" | "tampered" };

export function validateCachedLicense(): LicenseValidation {
  if (typeof window === "undefined") return { ok: false, reason: "missing" };

  if (localStorage.getItem(TAMPER_KEY) === "1") {
    return { ok: false, reason: "tampered" };
  }

  const lic = readCachedLicense();
  if (!lic) return { ok: false, reason: "missing" };

  const now = Date.now();
  const lastSeen = Number(localStorage.getItem(HEARTBEAT_KEY) || "0");

  // Detect rollback: device clock significantly earlier than last recorded heartbeat
  if (lastSeen && now < lastSeen - ROLLBACK_TOLERANCE_MS) {
    localStorage.setItem(TAMPER_KEY, "1");
    return { ok: false, reason: "tampered" };
  }

  // Expiry check (uses the later of system clock & last heartbeat to be tamper-resistant)
  const effectiveNow = Math.max(now, lastSeen);
  if (lic.expires_at) {
    const exp = new Date(lic.expires_at).getTime();
    if (effectiveNow > exp) return { ok: false, reason: "expired" };
  }

  // Roll heartbeat forward
  localStorage.setItem(HEARTBEAT_KEY, String(Math.max(now, lastSeen)));
  return { ok: true, license: lic };
}

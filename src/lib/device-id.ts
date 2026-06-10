// Stable client install identifier (NOT called "device" in UI per product copy).
// Stored in localStorage. Used to bind a license activation to a single browser install.
const STORAGE_KEY = "zr_install_id";
const LICENSE_KEY = "zr_license";

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
}

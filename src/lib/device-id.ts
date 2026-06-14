// Stable client install identifier used only for server-side device binding.
const STORAGE_KEY = "zr_install_id";

export function getInstallId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

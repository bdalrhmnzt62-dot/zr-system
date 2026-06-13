import { createClientOnlyFn } from "@tanstack/react-start";

function isPreviewHost(hostname: string) {
  return hostname.startsWith("id-preview--") || hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev");
}

async function unregisterAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.filter((registration) => new URL(registration.active?.scriptURL ?? "/", location.origin).pathname === "/sw.js").map((registration) => registration.unregister()));
}

export const setupPwa = createClientOnlyFn(async () => {
  const disabled = !import.meta.env.PROD || window.self !== window.top || isPreviewHost(location.hostname) || new URLSearchParams(location.search).has("sw", "off");
  if (disabled) {
    await unregisterAppWorker();
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
});
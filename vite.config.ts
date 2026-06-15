// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publicUrl = env.VITE_SUPABASE_URL;
  const publicKey = env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return {
    nitro: true,
    vite: {
      define: {
        "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicKey),
        "process.env.SUPABASE_URL": JSON.stringify(publicUrl),
        "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicKey),
      },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/~oauth/],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "zr-navigation", networkTimeoutSeconds: 4 },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === self.location.origin &&
                /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "zr-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
      ],
    },
    tanstackStart: {
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    },
  };
});

import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/marca-del-este/",
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192x192.png", "icon-512x512.png"],
      manifest: {
        name: "La Marca del Este",
        short_name: "Marca",
        description: "Hoja de personaje para Aventuras en la Marca del Este",
        theme_color: "#231B15",
        background_color: "#F3E9D2",
        display: "standalone",
        orientation: "portrait",
        scope: "/marca-del-este/",
        start_url: "/marca-del-este/",
        icons: [
          { src: "/marca-del-este/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/marca-del-este/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml" }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,svg,png,json,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  server: { host: "127.0.0.1", port: 4173 }
});

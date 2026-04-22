import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "La Marca del Este",
        short_name: "Marca",
        description: "Hoja de personaje para Aventuras en la Marca del Este",
        theme_color: "#231B15",
        background_color: "#F3E9D2",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json,woff2}"]
      }
    })
  ],
  server: { host: "127.0.0.1", port: 4173 }
});

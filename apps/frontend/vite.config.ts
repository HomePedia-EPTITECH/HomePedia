import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Le front appelle des chemins relatifs `/api/...` (même origine que la
    // page) ; Vite relaie vers le back NestJS côté serveur. Ça évite tout
    // souci CORS / Private Network Access / forwarding localhost sous WSL.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // Le back expose ses routes à la racine (/communes…), sans /api.
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
})

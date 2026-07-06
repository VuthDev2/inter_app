import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    tanstackStart({
      // All TanStack Start entry files (router, start, server) live in src/web/
      srcDirectory: "src/web",
      server: { entry: "server" },
      tsr: {
        // Route files live in src/web/routes/
        routesDirectory: "./src/web/routes",
        // Generated route tree goes in src/web/
        generatedRouteTree: "./src/web/routeTree.gen.ts",
      },
    }),
    tailwindcss(),
    react(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      // @/ → src/shared/ (shared code used by both web and mobile)
      "@": path.resolve(__dirname, "./src/shared"),
      // @web/ → src/web/ (web-only code)
      "@web": path.resolve(__dirname, "./src/web"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

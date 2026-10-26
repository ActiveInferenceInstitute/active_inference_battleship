import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import project from "./project.json" with { type: "json" };

export default defineConfig({
  plugins: [
    react(),
    {
      name: "battleship-initial-status",
      transformIndexHtml: {
        order: "pre",
        handler: (html) =>
          html.replaceAll(
            "__BATTLESHIP_ORGANIZATION__",
            project.organization
              .toUpperCase()
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;"),
          ),
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5186, strictPort: true },
  build: { target: "es2022", sourcemap: true },
});

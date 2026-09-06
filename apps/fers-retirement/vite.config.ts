import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "production-privacy-policy",
      // The development server needs its own refresh scripts and WebSocket.
      // Inject the restrictive policy only into the published build.
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler: (html) =>
          html.replace(
            "<head>",
            `<head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'none'" />
    <meta name="referrer" content="no-referrer" />`,
          ),
      },
    },
  ],
  base: "./",
  build: {
    outDir: "../../fers-retirement",
    emptyOutDir: true,
  },
});

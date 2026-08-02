import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      jsonwebtoken: fileURLToPath(new URL("./src/shims/jsonwebtoken.ts", import.meta.url)),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
  ],
});

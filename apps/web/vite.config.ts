import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(dirname, "../..");

// v2の画面部品はNext.jsからの移行中のためリポジトリ直下のsrcにある。切り替え時にこのアプリへ移す（#100）
export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(repositoryRoot, "public"),
  resolve: {
    alias: { "@": path.resolve(repositoryRoot, "src") },
    dedupe: ["react", "react-dom", "three"],
  },
  server: {
    fs: { allow: [repositoryRoot] },
    proxy: { "/api": "http://localhost:8787" },
  },
});

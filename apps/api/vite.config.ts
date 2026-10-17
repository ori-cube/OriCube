import { defineConfig } from "vite";

// Node.jsで `node dist/index.js` だけで起動できるよう、依存も含めて1ファイルにまとめる
export default defineConfig({
  build: {
    ssr: "src/index.ts",
    outDir: "dist",
    target: "node20",
  },
  ssr: {
    noExternal: true,
  },
});

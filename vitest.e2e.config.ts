import { defineConfig } from "vitest/config";

// ビルド済みの画面と API を起動し、実際のブラウザ（Playwright の Chromium）で操作する。pnpm build:web のあとに pnpm test:e2e で実行する
export default defineConfig({
  test: {
    name: "e2e",
    environment: "node",
    include: ["e2e/**/*.e2e.ts"],
    globalSetup: ["e2e/globalSetup.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // 同じサーバーとメモリ上の保存先を使うので、ファイルを順に実行する
    fileParallelism: false,
  },
});

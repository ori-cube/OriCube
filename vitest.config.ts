import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    exclude: ["node_modules", "dist", ".storybook"],
    projects: [
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: [
            "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "packages/engine/src/**/*.{test,spec}.ts",
            "apps/web/src/**/*.{test,spec}.{ts,tsx}",
          ],
        },
      },
      {
        // API は Worker と同じく DOM なしで動かす（D1 のテストは wrangler の getPlatformProxy を使う）
        extends: true,
        test: {
          name: "api",
          environment: "node",
          include: ["apps/api/src/**/*.{test,spec}.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".storybook/",
        "src/test/",
        "**/*.stories.{js,ts,jsx,tsx}",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});

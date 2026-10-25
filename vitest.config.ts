import { defineConfig } from "vitest/config";

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
          setupFiles: ["./apps/web/src/test/setup.ts"],
          include: [
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
        "apps/web/src/test/",
        "**/*.stories.{js,ts,jsx,tsx}",
      ],
    },
  },
});

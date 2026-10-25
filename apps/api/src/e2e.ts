import type { AuthVerifier } from "./auth";
import { startNodeServer } from "./node";

/**
 * E2E テスト用の入口（`pnpm test:e2e` が起動する）
 *
 * @description
 * Clerk のログインはテストで行えないため、Cookie `e2e_user` の値をログイン中のユーザーIDとして扱う。
 * 本番の入口（index.ts・worker.ts）とビルド（vite.config.ts の src/index.ts）には含めない
 */
const cookieVerifier: AuthVerifier = {
  authenticate: async (request) => request.headers.get("Cookie")?.match(/(?:^|;\s*)e2e_user=([A-Za-z0-9_-]+)/)?.[1] ?? null,
};

startNodeServer({ auth: cookieVerifier });

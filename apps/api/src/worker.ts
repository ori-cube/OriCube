import type { ExecutionContext } from "hono";
import { verifierFromEnv } from "./auth";
import { createD1OrigamiRepository, type D1Database } from "./d1Repository";
import { createServerApp } from "./pages";
import type { RateLimiter } from "./rateLimit";
import { createMockOrigamiRepository, withMockFallback } from "./repository";
import { createMemoryThumbnailStorage, createR2ThumbnailStorage, type ObjectStore } from "./storage";

/** wrangler.jsonc で定義するバインディングと環境変数 */
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** 作品を保存する D1。未設定ならメモリ上のモック（書き込みは永続化されない） */
  DB?: D1Database;
  /** OGPの絶対URLに使う公開オリジン。未設定ならリクエストのオリジン */
  APP_ORIGIN?: string;
  /** サムネイルを保存する R2。未設定ならメモリ上の実装（画像は永続化されない） */
  THUMBNAILS?: ObjectStore;
  /** 書き込みの回数制限（Rate Limiting バインディング）。未設定ならメモリ上の実装（isolate ごと） */
  WRITE_LIMITER?: RateLimiter;
  /** サムネイルのアップロード先の署名に使う秘密の値（wrangler secret で設定する） */
  THUMBNAIL_UPLOAD_SECRET?: string;
  /** Clerk のキー（シークレットは wrangler secret で設定する） */
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
}

let app: ReturnType<typeof createServerApp> | undefined;

/** 同じ isolate では index.html の読み込みとアプリの組み立てを1回だけ行う */
const getApp = async (request: Request, env: Env) => {
  if (app) return app;
  const index = await env.ASSETS.fetch(new Request(new URL("/", request.url)));
  if (!index.ok) throw new Error(`index.html を読み込めませんでした（${index.status}）`);
  app = createServerApp({
    template: await index.text(),
    origin: env.APP_ORIGIN || undefined,
    auth: verifierFromEnv(env),
    repository: env.DB ? withMockFallback(createD1OrigamiRepository(env.DB)) : createMockOrigamiRepository(),
    ...(env.WRITE_LIMITER ? { rateLimiter: env.WRITE_LIMITER } : {}),
    storage: env.THUMBNAILS ? createR2ThumbnailStorage(env.THUMBNAILS, env.THUMBNAIL_UPLOAD_SECRET) : createMemoryThumbnailStorage(),
  });
  return app;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (await getApp(request, env)).fetch(request, env, ctx);
  },
};

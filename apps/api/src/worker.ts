import type { ExecutionContext } from "hono";
import { createD1OrigamiRepository, type D1Database } from "./d1Repository";
import { humanVerifierFromEnv } from "./humanCheck";
import { createServerApp } from "./pages";
import { bindingRateLimiter, unlimited, type RateLimitBinding } from "./rateLimit";
import { createMockOrigamiRepository, withMockFallback } from "./repository";

/** wrangler.jsonc で定義するバインディングと環境変数 */
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** 作品を保存する D1。未設定ならメモリ上のモック（書き込みは永続化されない） */
  DB?: D1Database;
  /** OGPの絶対URLに使う公開オリジン。未設定ならリクエストのオリジン */
  APP_ORIGIN?: string;
  /** Turnstile の秘密鍵（wrangler secret で設定する）。未設定なら投稿をすべて拒否する */
  TURNSTILE_SECRET_KEY?: string;
  /** 投稿と、更新・削除の回数の上限（wrangler.jsonc の ratelimits） */
  POST_LIMITER?: RateLimitBinding;
  WRITE_LIMITER?: RateLimitBinding;
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
    human: humanVerifierFromEnv(env),
    postLimiter: env.POST_LIMITER ? bindingRateLimiter(env.POST_LIMITER) : unlimited,
    writeLimiter: env.WRITE_LIMITER ? bindingRateLimiter(env.WRITE_LIMITER) : unlimited,
    repository: env.DB ? withMockFallback(createD1OrigamiRepository(env.DB)) : createMockOrigamiRepository(),
  });
  return app;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (await getApp(request, env)).fetch(request, env, ctx);
  },
};

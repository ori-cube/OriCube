import type { ExecutionContext } from "hono";
import { verifierFromEnv } from "./auth";
import { createD1OrigamiRepository, type D1Database } from "./d1Repository";
import { createServerApp } from "./pages";
import { createMockOrigamiRepository, withMockFallback } from "./repository";

/** wrangler.jsonc で定義するバインディングと環境変数 */
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** 作品を保存する D1。未設定ならメモリ上のモック（書き込みは永続化されない） */
  DB?: D1Database;
  /** OGPの絶対URLに使う公開オリジン。未設定ならリクエストのオリジン */
  APP_ORIGIN?: string;
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
  });
  return app;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return (await getApp(request, env)).fetch(request, env, ctx);
  },
};

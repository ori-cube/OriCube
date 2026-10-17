import { Hono, type MiddlewareHandler } from "hono";
import { apiError } from "./errors";
import { createApp } from "./app";
import { mockOrigamiRepository, type OrigamiRepository } from "./repository";
import { modelIdSchema, origamiModelSchema } from "./schema";

const SITE_NAME = "OriCube";
const DEFAULT_DESCRIPTION = "折り紙の折り方を3Dで見る・作る";
const META_BLOCK = /<!-- page-meta:start -->[\s\S]*?<!-- page-meta:end -->/;

export interface PageMeta {
  title: string;
  description: string;
  /** og:url 用の絶対URL */
  url: string;
  /** og:image 用の絶対URL */
  image: string;
  /** 検索結果に出さない（404・エラー） */
  noindex?: boolean;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

/**
 * SPAの index.html の meta 部分を差し替える
 *
 * @description
 * SNSのクローラーはJavaScriptを実行しないため、作品ページのタイトル・説明・OGPはHTMLとして返す
 */
export const renderPage = (template: string, meta: PageMeta) => {
  if (!META_BLOCK.test(template)) throw new Error("index.html に page-meta の目印がありません");
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    ...(meta.noindex ? [`<meta name="robots" content="noindex" />`] : []),
  ];
  return template.replace(META_BLOCK, () => tags.join("\n    "));
};

interface ServerAppOptions {
  /** ビルド済みの apps/web/dist/index.html */
  template: string;
  repository?: OrigamiRepository;
  /** 公開時のオリジン（例: https://oricube.example）。未指定ならリクエストのオリジンを使う */
  origin?: string;
  /** /assets/* の静的ファイルを返すミドルウェア（実行環境ごとに渡す） */
  assets?: MiddlewareHandler;
}

/**
 * APIと画面を同一オリジンで返すアプリ
 *
 * @description
 * - /api/* はAPI、それ以外はSPAの index.html を返す
 * - 作品ページは作品名・説明をmetaに入れ、存在しない作品・URLはHTTP 404にする
 * - 静的ファイルの配信は実行環境ごとのミドルウェアを assets で受け取る（Node.jsでは index.ts）
 */
export const createServerApp = ({ template, repository = mockOrigamiRepository, origin, assets }: ServerAppOptions) => {
  renderPage(template, { title: SITE_NAME, description: DEFAULT_DESCRIPTION, url: "/", image: "/" });
  const absolute = (requestUrl: string, path: string) => new URL(path, origin ?? new URL(requestUrl).origin).toString();
  const meta = (requestUrl: string, overrides: Partial<PageMeta> = {}): PageMeta => ({
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: absolute(requestUrl, new URL(requestUrl).pathname),
    image: absolute(requestUrl, "/assets/OriCube.png"),
    ...overrides,
  });
  const notFoundPage = (requestUrl: string) => renderPage(template, meta(requestUrl, { title: `ページが見つかりません | ${SITE_NAME}`, noindex: true }));

  const app = new Hono();
  if (assets) app.use("/assets/*", assets);
  return app
    .route("/", createApp({ repository }))
    .get("/view/:id", async (c) => {
      const id = modelIdSchema.safeParse(c.req.param("id"));
      const stored = id.success ? await repository.findById(id.data) : null;
      if (stored === null) return c.html(notFoundPage(c.req.url), 404);
      const model = origamiModelSchema.safeParse(stored);
      if (!model.success) throw new Error(`保存済みの作品 ${id.data} の形式が正しくありません`);
      return c.html(renderPage(template, meta(c.req.url, {
        title: `${model.data.name}の折り方 | ${SITE_NAME}`,
        description: model.data.description || DEFAULT_DESCRIPTION,
      })));
    })
    .get("/", (c) => c.html(renderPage(template, meta(c.req.url))))
    .get("/view", (c) => c.html(renderPage(template, meta(c.req.url))))
    .get("/post", (c) => c.html(renderPage(template, meta(c.req.url, { title: `折り紙を作る | ${SITE_NAME}` }))))
    .notFound((c) => c.req.path.startsWith("/api/")
      ? apiError(c, 404, "not_found", "APIが見つかりません。")
      : c.html(notFoundPage(c.req.url), 404))
    .onError((error, c) => {
      console.error(error);
      if (c.req.path.startsWith("/api/")) return apiError(c, 500, "internal_error", "サーバーでエラーが発生しました。");
      return c.html(renderPage(template, meta(c.req.url, { title: `エラー | ${SITE_NAME}`, noindex: true })), 500);
    });
};

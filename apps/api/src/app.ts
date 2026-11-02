import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cache } from "hono/cache";
import { csrf } from "hono/csrf";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { createEditKey, EDIT_KEY_HEADER, hashEditKey } from "./editKey";
import { apiError, handleApiError } from "./errors";
import { rejectingHumanVerifier, type HumanVerifier } from "./humanCheck";
import { unlimited, type RateLimiter } from "./rateLimit";
import { createMockOrigamiRepository, type OrigamiRecord, type OrigamiRepository } from "./repository";
import { modelIdSchema, origamiCreateSchema, origamiInputSchema, origamiListQuerySchema, origamiModelSchema } from "./schema";
import { normalizeSearchText, summarize } from "./summary";
import { renderThumbnailPng } from "./thumbnailImage";

/** リクエスト本文の上限。作品データの上限（engine の PROCEDURE_V2_LIMITS）と合わせて見直す */
const MAX_BODY_BYTES = 1024 * 1024;
/** 一覧の1ページの件数 */
export const MODELS_PAGE_SIZE = 24;

/** 完成形の画像を Cache API に置く時間（秒）。作品を更新しても、この時間は前の画像を返すことがある */
const THUMBNAIL_CACHE_SECONDS = 3600;

export interface AppOptions {
  repository?: OrigamiRepository;
  /** 投稿したのが人かどうかの検証（本番は Turnstile）。未指定なら投稿をすべて拒否する */
  human?: HumanVerifier;
  /** 投稿の回数の上限（接続元の IP ごと） */
  postLimiter?: RateLimiter;
  /** 更新・削除の回数の上限（接続元の IP ごと。鍵の総当たりを抑える） */
  writeLimiter?: RateLimiter;
}

export const createApp = ({ repository = createMockOrigamiRepository(), human = rejectingHumanVerifier, postLimiter = unlimited, writeLimiter = unlimited }: AppOptions = {}) => {
  const idParam = zValidator("param", z.object({ id: modelIdSchema }), (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品IDの形式が正しくありません。");
  });
  const listQuery = zValidator("query", origamiListQuerySchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "検索条件が正しくありません。");
  });
  const modelBody = zValidator("json", origamiInputSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品の内容が正しくありません。");
  });
  const createBody = zValidator("json", origamiCreateSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品の内容が正しくありません。");
  });
  /** 接続元の IP。Workers では Cloudflare が付ける。無ければ（Node.js）まとめて数える */
  const clientIp = (request: Request) => request.headers.get("CF-Connecting-IP");
  const limitBy = (limiter: RateLimiter) => createMiddleware(async (c, next) => {
    if (!(await limiter.limit(clientIp(c.req.raw) ?? "unknown"))) return apiError(c, 429, "rate_limited", "短い時間に操作が続いています。少し待ってからもう一度お試しください。");
    await next();
  });
  /** 編集用の鍵を必須にし、ハッシュを editKeyHash に入れる */
  const requireEditKey = createMiddleware<{ Variables: { editKeyHash: string } }>(async (c, next) => {
    const key = c.req.header(EDIT_KEY_HEADER);
    if (!key) return apiError(c, 401, "unauthorized", "編集用の鍵が必要です。");
    c.set("editKeyHash", await hashEditKey(key));
    await next();
  });
  /** 作品を読み、鍵が合わなければ 403 にする。鍵の無い作品（モック）は誰も変更できない */
  const findOwned = async (id: string, editKeyHash: string) => {
    const record = await repository.findById(id);
    if (!record) return "not_found" as const;
    return record.editKeyHash !== null && record.editKeyHash === editKeyHash ? record : ("forbidden" as const);
  };
  /** 保存済みの値を検証する。不正なら中身を返さないよう null にしてログに残す */
  const parseStored = (id: string, record: OrigamiRecord) => {
    const model = origamiModelSchema.safeParse(record.model);
    if (model.success) return model.data;
    console.error(`保存済みの作品 ${id} の形式が正しくありません`, model.error.issues);
    return null;
  };

  return new Hono()
    .basePath("/api")
    .use(bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => apiError(c, 413, "payload_too_large", "リクエストが大きすぎます。") }))
    // 他サイトからのフォーム送信を Origin で拒否する
    // （JSON と編集用の鍵のヘッダーはクロスオリジンだとプリフライトで止まり、CORS は許可していない）
    .use(csrf())
    .get("/models", listQuery, async (c) => {
      const { q, page } = c.req.valid("query");
      // 限定公開の作品は一覧・検索に出さない（URLを知っている人だけが見る）。形式が正しくない作品は保存先が除いて記録する
      const { items, total } = await repository.listPublic({ keyword: q ? normalizeSearchText(q) : "", offset: (page - 1) * MODELS_PAGE_SIZE, limit: MODELS_PAGE_SIZE });
      return c.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / MODELS_PAGE_SIZE)) }, 200);
    })
    .get("/models/:id", idParam, async (c) => {
      const { id } = c.req.valid("param");
      const record = await repository.findById(id);
      if (record === null) return apiError(c, 404, "not_found", "作品が見つかりません。");
      const model = parseStored(id, record);
      if (!model) return apiError(c, 500, "internal_error", "作品を読み込めませんでした。");
      return c.json(model, 200);
    })
    // 一覧・OGP 用の完成形の画像。投稿者が送る画像は使わず、保存済みの手順から描く。
    // 描くのが重い（数十ms）ため、Workers では Cache API に置いて使い回す（Node.js では caches が無いので毎回描く）
    .get("/models/:id/thumbnail.png", cache({ cacheName: "oricube-thumbnails", onCacheNotAvailable: false }), idParam, async (c) => {
      const { id } = c.req.valid("param");
      const record = await repository.findById(id);
      if (record === null) return apiError(c, 404, "not_found", "作品が見つかりません。");
      const model = parseStored(id, record);
      if (!model) return apiError(c, 500, "internal_error", "作品を読み込めませんでした。");
      return c.body(await renderThumbnailPng(summarize(model).thumbnail, model.color), 200, {
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
        // Cache API もこの時間で消す。作品を更新すると変わるので、長くは持たせない
        "Cache-Control": `public, max-age=${THUMBNAIL_CACHE_SECONDS}`,
      });
    })
    // ログインの代わりに、Turnstile で人が投稿したことを確かめ、編集用の鍵を1回だけ返す
    .post("/models", limitBy(postLimiter), createBody, async (c) => {
      const { turnstileToken, ...input } = c.req.valid("json");
      if (!(await human.verify(turnstileToken, clientIp(c.req.raw)))) return apiError(c, 403, "verification_failed", "ロボットでないことを確認できませんでした。");
      const id = crypto.randomUUID();
      const editKey = await createEditKey();
      await repository.create({ editKeyHash: editKey.hash, model: { id, ...input } });
      return c.json({ id, editKey: editKey.key }, 201);
    })
    .put("/models/:id", limitBy(writeLimiter), requireEditKey, idParam, modelBody, async (c) => {
      const { id } = c.req.valid("param");
      const owned = await findOwned(id, c.var.editKeyHash);
      if (owned === "not_found") return apiError(c, 404, "not_found", "作品が見つかりません。");
      if (owned === "forbidden") return apiError(c, 403, "forbidden", "この作品を変更する権限がありません。");
      await repository.update(id, { id, ...c.req.valid("json") });
      return c.json({ id }, 200);
    })
    .delete("/models/:id", limitBy(writeLimiter), requireEditKey, idParam, async (c) => {
      const { id } = c.req.valid("param");
      const owned = await findOwned(id, c.var.editKeyHash);
      if (owned === "not_found") return apiError(c, 404, "not_found", "作品が見つかりません。");
      if (owned === "forbidden") return apiError(c, 403, "forbidden", "この作品を削除する権限がありません。");
      await repository.delete(id);
      return c.body(null, 204);
    })
    .notFound((c) => apiError(c, 404, "not_found", "APIが見つかりません。"))
    .onError(handleApiError);
};

export const app = createApp();

/** Hono RPC（hono/client）用の型。フロントは type-only import で使う */
export type AppType = typeof app;

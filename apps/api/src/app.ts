import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cache } from "hono/cache";
import { csrf } from "hono/csrf";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { anonymousVerifier, type AuthVerifier } from "./auth";
import { apiError, handleApiError } from "./errors";
import { createMockOrigamiRepository, type OrigamiRecord, type OrigamiRepository } from "./repository";
import { modelIdSchema, origamiInputSchema, origamiListQuerySchema, origamiModelSchema } from "./schema";
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
  auth?: AuthVerifier;
}

export const createApp = ({ repository = createMockOrigamiRepository(), auth = anonymousVerifier }: AppOptions = {}) => {
  const idParam = zValidator("param", z.object({ id: modelIdSchema }), (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品IDの形式が正しくありません。");
  });
  const listQuery = zValidator("query", origamiListQuerySchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "検索条件が正しくありません。");
  });
  const modelBody = zValidator("json", origamiInputSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品の内容が正しくありません。");
  });
  /** ログインを必須にし、検証済みのユーザーIDを userId に入れる */
  const requireUser = createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
    const userId = await auth.authenticate(c.req.raw);
    if (!userId) return apiError(c, 401, "unauthorized", "ログインが必要です。");
    c.set("userId", userId);
    await next();
  });
  /** 作品を読み、所有者でなければ 403 にする */
  const findOwned = async (id: string, userId: string) => {
    const record = await repository.findById(id);
    if (!record) return "not_found" as const;
    return record.ownerId === userId ? record : ("forbidden" as const);
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
    // セッションは同一オリジンの Cookie。フォーム送信による他サイトからの書き込みを Origin で拒否する
    // （JSON はクロスオリジンだとプリフライトで止まり、CORS は許可していない）
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
    .post("/models", requireUser, modelBody, async (c) => {
      const id = crypto.randomUUID();
      await repository.create({ ownerId: c.var.userId, model: { id, ...c.req.valid("json") } });
      return c.json({ id }, 201);
    })
    .put("/models/:id", requireUser, idParam, modelBody, async (c) => {
      const { id } = c.req.valid("param");
      const owned = await findOwned(id, c.var.userId);
      if (owned === "not_found") return apiError(c, 404, "not_found", "作品が見つかりません。");
      if (owned === "forbidden") return apiError(c, 403, "forbidden", "この作品を変更する権限がありません。");
      await repository.update(id, { id, ...c.req.valid("json") });
      return c.json({ id }, 200);
    })
    .delete("/models/:id", requireUser, idParam, async (c) => {
      const { id } = c.req.valid("param");
      const owned = await findOwned(id, c.var.userId);
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

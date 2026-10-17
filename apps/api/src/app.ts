import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { csrf } from "hono/csrf";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { anonymousVerifier, type AuthVerifier } from "./auth";
import { apiError, handleApiError } from "./errors";
import { createMockOrigamiRepository, type OrigamiRecord, type OrigamiRepository } from "./repository";
import { modelIdSchema, origamiCreateSchema, origamiInputSchema, origamiModelSchema, thumbnailSpecSchema, type OrigamiSummary } from "./schema";
import { createMemoryThumbnailStorage, thumbnailKey, type ThumbnailStorage } from "./storage";

/** リクエスト本文の上限。作品データの上限（engine の PROCEDURE_V2_LIMITS）と合わせて見直す */
const MAX_BODY_BYTES = 1024 * 1024;

/** 一覧で一度に返す作品数の上限 */
const MAX_LIST_LIMIT = 100;

export interface AppOptions {
  repository?: OrigamiRepository;
  auth?: AuthVerifier;
  /** サムネイルの保存先（本番は R2）。未指定ならメモリ上の実装 */
  storage?: ThumbnailStorage;
}

export const createApp = ({ repository = createMockOrigamiRepository(), auth = anonymousVerifier, storage = createMemoryThumbnailStorage() }: AppOptions = {}) => {
  const idParam = zValidator("param", z.object({ id: modelIdSchema }), (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品IDの形式が正しくありません。");
  });
  const modelBody = zValidator("json", origamiInputSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品の内容が正しくありません。");
  });
  const createBody = zValidator("json", origamiCreateSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品の内容またはサムネイルの形式が正しくありません。");
  });
  const thumbnailBody = zValidator("json", thumbnailSpecSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "サムネイルの形式が正しくありません。");
  });
  const listQuery = zValidator("query", z.object({ limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).default(30) }), (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "一覧の取得条件が正しくありません。");
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

  const api = new Hono()
    .basePath("/api")
    .use(bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => apiError(c, 413, "payload_too_large", "リクエストが大きすぎます。") }))
    // セッションは同一オリジンの Cookie。フォーム送信による他サイトからの書き込みを Origin で拒否する
    // （JSON はクロスオリジンだとプリフライトで止まり、CORS は許可していない）
    .use(csrf());
  // メモリ上の保存先は、presigned URL の代わりのアップロード先と画像の配信を /api の下に持つ
  if (storage.routes) api.route("/", storage.routes);

  return api
    .get("/models", listQuery, async (c) => {
      const records = await repository.listPublished({ limit: c.req.valid("query").limit });
      const items = records.flatMap((record): OrigamiSummary[] => {
        const { id } = record.model as { id: string };
        const model = parseStored(id, record);
        if (!model) return [];
        return [{ id: model.id, name: model.name, color: model.color, thumbnailUrl: record.thumbnail ? storage.publicUrl(record.thumbnail.key) : null }];
      });
      return c.json({ items }, 200);
    })
    .get("/models/:id", idParam, async (c) => {
      const { id } = c.req.valid("param");
      const record = await repository.findById(id);
      // サムネイルの確定前（pending）の作品は公開しない
      if (record === null || record.status !== "published") return apiError(c, 404, "not_found", "作品が見つかりません。");
      const model = parseStored(id, record);
      if (!model) return apiError(c, 500, "internal_error", "作品を読み込めませんでした。");
      return c.json(model, 200);
    })
    // 投稿は pending で作り、サムネイルのアップロード先を返す。画像を置いてから /publish で公開する
    .post("/models", requireUser, createBody, async (c) => {
      const { thumbnail: spec, ...input } = c.req.valid("json");
      const id = crypto.randomUUID();
      const thumbnail = { key: thumbnailKey(id, spec.contentType), ...spec };
      await repository.create({ ownerId: c.var.userId, status: "pending", thumbnail, model: { id, ...input } });
      return c.json({ id, status: "pending" as const, thumbnailUpload: await storage.createUpload(thumbnail.key, spec) }, 201);
    })
    // アップロードに失敗・期限切れになったときに、公開前の作品のアップロード先を作り直す
    .post("/models/:id/thumbnail-upload", requireUser, idParam, thumbnailBody, async (c) => {
      const { id } = c.req.valid("param");
      const owned = await findOwned(id, c.var.userId);
      if (owned === "not_found") return apiError(c, 404, "not_found", "作品が見つかりません。");
      if (owned === "forbidden") return apiError(c, 403, "forbidden", "この作品を変更する権限がありません。");
      if (owned.status !== "pending") return apiError(c, 409, "conflict", "公開済みの作品のサムネイルはここでは変更できません。");
      const spec = c.req.valid("json");
      const thumbnail = { key: thumbnailKey(id, spec.contentType), ...spec };
      await repository.update(id, { thumbnail });
      if (owned.thumbnail) await storage.delete(owned.thumbnail.key);
      return c.json({ id, status: "pending" as const, thumbnailUpload: await storage.createUpload(thumbnail.key, spec) }, 200);
    })
    // 申告どおりのサムネイルが置かれていることを確かめてから公開する。公開済みなら何もしない（再試行できる）
    .post("/models/:id/publish", requireUser, idParam, async (c) => {
      const { id } = c.req.valid("param");
      const owned = await findOwned(id, c.var.userId);
      if (owned === "not_found") return apiError(c, 404, "not_found", "作品が見つかりません。");
      if (owned === "forbidden") return apiError(c, 403, "forbidden", "この作品を公開する権限がありません。");
      if (owned.status === "published") return c.json({ id, status: "published" as const }, 200);
      const uploaded = owned.thumbnail ? await storage.head(owned.thumbnail.key) : null;
      if (!owned.thumbnail || !uploaded || uploaded.contentType !== owned.thumbnail.contentType || uploaded.size !== owned.thumbnail.size) {
        return apiError(c, 409, "conflict", "サムネイルがアップロードされていません。");
      }
      await repository.update(id, { status: "published" });
      return c.json({ id, status: "published" as const }, 200);
    })
    .put("/models/:id", requireUser, idParam, modelBody, async (c) => {
      const { id } = c.req.valid("param");
      const owned = await findOwned(id, c.var.userId);
      if (owned === "not_found") return apiError(c, 404, "not_found", "作品が見つかりません。");
      if (owned === "forbidden") return apiError(c, 403, "forbidden", "この作品を変更する権限がありません。");
      await repository.update(id, { model: { id, ...c.req.valid("json") } });
      return c.json({ id }, 200);
    })
    .delete("/models/:id", requireUser, idParam, async (c) => {
      const { id } = c.req.valid("param");
      const owned = await findOwned(id, c.var.userId);
      if (owned === "not_found") return apiError(c, 404, "not_found", "作品が見つかりません。");
      if (owned === "forbidden") return apiError(c, 403, "forbidden", "この作品を削除する権限がありません。");
      await repository.delete(id);
      // 画像の削除に失敗しても作品は消えている。残った画像は pending の掃除と同じく後から消す
      if (owned.thumbnail) await storage.delete(owned.thumbnail.key).catch((error) => console.error(`作品 ${id} のサムネイルを削除できませんでした`, error));
      return c.body(null, 204);
    })
    .notFound((c) => apiError(c, 404, "not_found", "APIが見つかりません。"))
    .onError(handleApiError);
};

export const app = createApp();

/** Hono RPC（hono/client）用の型。フロントは type-only import で使う */
export type AppType = typeof app;

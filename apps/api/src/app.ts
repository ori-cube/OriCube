import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { csrf } from "hono/csrf";
import { createMiddleware } from "hono/factory";
import { createProcedureThumbnail, createViewerTimeline } from "@oricube/engine";
import { z } from "zod";
import { anonymousVerifier, type AuthVerifier } from "./auth";
import { apiError, handleApiError } from "./errors";
import { createMockOrigamiRepository, type OrigamiRecord, type OrigamiRepository } from "./repository";
import { modelIdSchema, origamiCreateSchema, origamiInputSchema, origamiListQuerySchema, origamiModelSchema, thumbnailSpecSchema, type OrigamiModel } from "./schema";
import { createMemoryThumbnailStorage, isThumbnailKeyOf, thumbnailKey, type ThumbnailStorage } from "./storage";

/** リクエスト本文の上限。作品データの上限（engine の PROCEDURE_V2_LIMITS）と合わせて見直す */
const MAX_BODY_BYTES = 1024 * 1024;
/** 一覧の1ページの件数 */
export const MODELS_PAGE_SIZE = 24;

/** 検索語の比較用に、全角・半角と大文字・小文字の違いをそろえる */
const normalize = (value: string) => value.normalize("NFKC").toLowerCase();

/**
 * 一覧で返す作品の要約。手順の本体は含めず、完成形のサムネイルを付ける
 *
 * @description
 * thumbnailUrl は投稿時に撮影した画像（無い作品は null）。thumbnail は手順から作る完成形の図で、画像が無い作品の表示に使う
 */
const toSummary = (model: OrigamiModel, thumbnailUrl: string | null) => {
  const timeline = createViewerTimeline(model.procedure, model.presentation);
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    color: model.color,
    stepCount: timeline.steps.length,
    thumbnail: createProcedureThumbnail(model.procedure, timeline),
    thumbnailUrl,
  };
};

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
  const listQuery = zValidator("query", origamiListQuerySchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "検索条件が正しくありません。");
  });
  const modelBody = zValidator("json", origamiInputSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品の内容が正しくありません。");
  });
  const createBody = zValidator("json", origamiCreateSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品の内容またはサムネイルの形式が正しくありません。");
  });
  const replaceThumbnailBody = zValidator("json", z.object({ key: z.string().max(200) }), (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "サムネイルの指定が正しくありません。");
  });
  const thumbnailBody = zValidator("json", thumbnailSpecSchema, (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "サムネイルの形式が正しくありません。");
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
  // 保存先は、署名付きのアップロード先と画像の配信を /api の下に持つ
  if (storage.routes) api.route("/", storage.routes);

  return api
    .get("/models", listQuery, async (c) => {
      const { q, page } = c.req.valid("query");
      const keyword = q ? normalize(q) : "";
      // 公開済みの作品だけを並べる。壊れた作品があっても一覧全体は返せるよう、検証できない作品は除いて記録する
      const models = (await repository.list()).flatMap((record) => {
        const model = origamiModelSchema.safeParse(record.model);
        if (model.success) return [{ model: model.data, thumbnailUrl: record.thumbnail ? storage.publicUrl(record.thumbnail.key) : null }];
        console.error("一覧から形式が正しくない作品を除きました", model.error.issues);
        return [];
      });
      // 限定公開の作品は一覧・検索に出さない（URLを知っている人だけが見る）
      const listed = models.filter(({ model }) => model.visibility === "public");
      const matched = keyword ? listed.filter(({ model }) => normalize(`${model.name}\n${model.description}`).includes(keyword)) : listed;
      const totalPages = Math.max(1, Math.ceil(matched.length / MODELS_PAGE_SIZE));
      const items = matched.slice((page - 1) * MODELS_PAGE_SIZE, page * MODELS_PAGE_SIZE).map(({ model, thumbnailUrl }) => toSummary(model, thumbnailUrl));
      return c.json({ items, total: matched.length, page, totalPages }, 200);
    })
    // 自分の作品。公開範囲に関わらず、公開前（pending）の作品も含めて返す（編集・削除の画面用）
    .get("/me/models", requireUser, async (c) => {
      const items = (await repository.listByOwner(c.var.userId)).flatMap((record) => {
        const model = origamiModelSchema.safeParse(record.model);
        if (!model.success) {
          console.error("自分の作品の一覧から形式が正しくない作品を除きました", model.error.issues);
          return [];
        }
        const summary = toSummary(model.data, record.thumbnail ? storage.publicUrl(record.thumbnail.key) : null);
        return [{ ...summary, visibility: model.data.visibility, status: record.status }];
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
      const spec = c.req.valid("json");
      const thumbnail = { key: thumbnailKey(id, spec.contentType), ...spec };
      // 公開済みの作品は、置いた画像を PUT /thumbnail で差し替えるまで今のサムネイルのままにする
      if (owned.status === "published") {
        return c.json({ id, status: "published" as const, thumbnailKey: thumbnail.key, thumbnailUpload: await storage.createUpload(thumbnail.key, spec) }, 200);
      }
      await repository.update(id, { thumbnail });
      if (owned.thumbnail) await storage.delete(owned.thumbnail.key);
      return c.json({ id, status: "pending" as const, thumbnailKey: thumbnail.key, thumbnailUpload: await storage.createUpload(thumbnail.key, spec) }, 200);
    })
    // 公開済みの作品のサムネイルを、アップロード済みの画像に差し替える（再編集で撮り直したとき）
    .put("/models/:id/thumbnail", requireUser, idParam, replaceThumbnailBody, async (c) => {
      const { id } = c.req.valid("param");
      const { key } = c.req.valid("json");
      const owned = await findOwned(id, c.var.userId);
      if (owned === "not_found") return apiError(c, 404, "not_found", "作品が見つかりません。");
      if (owned === "forbidden") return apiError(c, 403, "forbidden", "この作品を変更する権限がありません。");
      if (owned.status !== "published") return apiError(c, 409, "conflict", "公開前の作品は公開APIでサムネイルを確定してください。");
      // その作品のために発行したキーだけを受け付ける（アップロード先は所有者にだけ発行している）
      if (!isThumbnailKeyOf(id, key)) return apiError(c, 400, "invalid_request", "サムネイルの指定が正しくありません。");
      if (owned.thumbnail?.key === key) return c.json({ id }, 200);
      const uploaded = await storage.head(key);
      if (!uploaded) return apiError(c, 409, "conflict", "サムネイルがアップロードされていません。");
      await repository.update(id, { thumbnail: { key, ...uploaded } });
      if (owned.thumbnail) await storage.delete(owned.thumbnail.key).catch((error) => console.error(`作品 ${id} の古いサムネイルを削除できませんでした`, error));
      return c.json({ id }, 200);
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

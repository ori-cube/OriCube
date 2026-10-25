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
import { modelIdSchema, origamiInputSchema, origamiListQuerySchema, origamiModelSchema, type OrigamiModel } from "./schema";
import { renderThumbnailPng } from "./thumbnailImage";

/** リクエスト本文の上限。作品データの上限（engine の PROCEDURE_V2_LIMITS）と合わせて見直す */
const MAX_BODY_BYTES = 1024 * 1024;
/** 一覧の1ページの件数 */
export const MODELS_PAGE_SIZE = 24;

/** 検索語の比較用に、全角・半角と大文字・小文字の違いをそろえる */
const normalize = (value: string) => value.normalize("NFKC").toLowerCase();

/** 完成形を見せる向き（presentation）で、手順から完成形の図を作る */
const thumbnailOf = (model: OrigamiModel) => createProcedureThumbnail(model.procedure, createViewerTimeline(model.procedure, model.presentation));

/** 一覧で返す作品の要約。手順の本体は含めず、完成形の図を付ける */
const toSummary = (model: OrigamiModel) => {
  const timeline = createViewerTimeline(model.procedure, model.presentation);
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    color: model.color,
    stepCount: timeline.steps.length,
    thumbnail: createProcedureThumbnail(model.procedure, timeline),
  };
};

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
      const keyword = q ? normalize(q) : "";
      // 公開済みの作品だけを並べる。壊れた作品があっても一覧全体は返せるよう、検証できない作品は除いて記録する
      const models = (await repository.list()).flatMap((record) => {
        const model = origamiModelSchema.safeParse(record.model);
        if (model.success) return [model.data];
        console.error("一覧から形式が正しくない作品を除きました", model.error.issues);
        return [];
      });
      // 限定公開の作品は一覧・検索に出さない（URLを知っている人だけが見る）
      const listed = models.filter((model) => model.visibility === "public");
      const matched = keyword ? listed.filter((model) => normalize(`${model.name}\n${model.description}`).includes(keyword)) : listed;
      const totalPages = Math.max(1, Math.ceil(matched.length / MODELS_PAGE_SIZE));
      const items = matched.slice((page - 1) * MODELS_PAGE_SIZE, page * MODELS_PAGE_SIZE).map(toSummary);
      return c.json({ items, total: matched.length, page, totalPages }, 200);
    })
    .get("/models/:id", idParam, async (c) => {
      const { id } = c.req.valid("param");
      const record = await repository.findById(id);
      if (record === null) return apiError(c, 404, "not_found", "作品が見つかりません。");
      const model = parseStored(id, record);
      if (!model) return apiError(c, 500, "internal_error", "作品を読み込めませんでした。");
      return c.json(model, 200);
    })
    // 一覧・OGP 用の完成形の画像。投稿者が送る画像は使わず、保存済みの手順から描く
    .get("/models/:id/thumbnail.png", idParam, async (c) => {
      const { id } = c.req.valid("param");
      const record = await repository.findById(id);
      if (record === null) return apiError(c, 404, "not_found", "作品が見つかりません。");
      const model = parseStored(id, record);
      if (!model) return apiError(c, 500, "internal_error", "作品を読み込めませんでした。");
      return c.body(await renderThumbnailPng(thumbnailOf(model), model.color), 200, {
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
        // 作品を編集すると変わるので、長くは持たせない
        "Cache-Control": "public, max-age=3600",
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

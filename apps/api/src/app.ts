import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { csrf } from "hono/csrf";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { anonymousVerifier, type AuthVerifier } from "./auth";
import { apiError, handleApiError } from "./errors";
import { createMockOrigamiRepository, type OrigamiRepository } from "./repository";
import { modelIdSchema, origamiInputSchema, origamiModelSchema } from "./schema";

/** リクエスト本文の上限。作品データの上限（engine の PROCEDURE_V2_LIMITS）と合わせて見直す */
const MAX_BODY_BYTES = 1024 * 1024;

interface AppOptions {
  repository?: OrigamiRepository;
  auth?: AuthVerifier;
}

export const createApp = ({ repository = createMockOrigamiRepository(), auth = anonymousVerifier }: AppOptions = {}) => {
  const idParam = zValidator("param", z.object({ id: modelIdSchema }), (result, c) => {
    if (!result.success) return apiError(c, 400, "invalid_request", "作品IDの形式が正しくありません。");
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

  return new Hono()
    .basePath("/api")
    .use(bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => apiError(c, 413, "payload_too_large", "リクエストが大きすぎます。") }))
    // セッションは同一オリジンの Cookie。フォーム送信による他サイトからの書き込みを Origin で拒否する
    // （JSON はクロスオリジンだとプリフライトで止まり、CORS は許可していない）
    .use(csrf())
    .get("/models/:id", idParam, async (c) => {
      const { id } = c.req.valid("param");
      const record = await repository.findById(id);
      if (record === null) return apiError(c, 404, "not_found", "作品が見つかりません。");
      const model = origamiModelSchema.safeParse(record.model);
      if (!model.success) {
        console.error(`保存済みの作品 ${id} の形式が正しくありません`, model.error.issues);
        return apiError(c, 500, "internal_error", "作品を読み込めませんでした。");
      }
      return c.json(model.data, 200);
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

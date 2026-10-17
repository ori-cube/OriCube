import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { apiError } from "./errors";
import { mockOrigamiRepository, type OrigamiRepository } from "./repository";
import { modelIdSchema, origamiModelSchema } from "./schema";

/** リクエスト本文の上限。投稿APIを追加するときは作品データの上限と合わせて見直す */
const MAX_BODY_BYTES = 1024 * 1024;

export const createApp = ({ repository = mockOrigamiRepository }: { repository?: OrigamiRepository } = {}) =>
  new Hono()
    .basePath("/api")
    .use(bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => apiError(c, 413, "payload_too_large", "リクエストが大きすぎます。") }))
    .get(
      "/models/:id",
      zValidator("param", z.object({ id: modelIdSchema }), (result, c) => {
        if (!result.success) return apiError(c, 400, "invalid_request", "作品IDの形式が正しくありません。");
      }),
      async (c) => {
        const { id } = c.req.valid("param");
        const stored = await repository.findById(id);
        if (stored === null) return apiError(c, 404, "not_found", "作品が見つかりません。");
        const model = origamiModelSchema.safeParse(stored);
        if (!model.success) {
          console.error(`保存済みの作品 ${id} の形式が正しくありません`, model.error.issues);
          return apiError(c, 500, "internal_error", "作品を読み込めませんでした。");
        }
        return c.json(model.data, 200);
      }
    )
    .notFound((c) => apiError(c, 404, "not_found", "APIが見つかりません。"))
    .onError((error, c) => {
      console.error(error);
      return apiError(c, 500, "internal_error", "サーバーでエラーが発生しました。");
    });

export const app = createApp();

/** Hono RPC（hono/client）用の型。フロントは type-only import で使う */
export type AppType = typeof app;

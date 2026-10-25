import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "too_many_requests"
  | "internal_error";

/** APIのエラーは常にこの形で返す */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export const apiError = <S extends ContentfulStatusCode>(c: Context, status: S, code: ApiErrorCode, message: string) =>
  c.json<ApiErrorBody, S>({ error: { code, message } }, status);

/**
 * APIで投げられた例外を共通の形で返す
 *
 * @description
 * ミドルウェアが投げる HTTPException（csrf の 403 など）はそのステータスを保つ。それ以外は 500
 */
export const handleApiError = (error: Error, c: Context) => {
  if (error instanceof HTTPException && error.status === 403) return apiError(c, 403, "forbidden", "このリクエストは受け付けられません。");
  if (error instanceof HTTPException && error.status < 500) return apiError(c, 400, "invalid_request", "リクエストが正しくありません。");
  console.error(error);
  return apiError(c, 500, "internal_error", "サーバーでエラーが発生しました。");
};

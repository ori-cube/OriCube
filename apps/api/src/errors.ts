import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiErrorCode = "invalid_request" | "not_found" | "payload_too_large" | "internal_error";

/** APIのエラーは常にこの形で返す */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export const apiError = <S extends ContentfulStatusCode>(c: Context, status: S, code: ApiErrorCode, message: string) =>
  c.json<ApiErrorBody, S>({ error: { code, message } }, status);

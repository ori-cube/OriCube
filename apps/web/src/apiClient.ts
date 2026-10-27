import type { AppType } from "@oricube/api";
import type { OrigamiModelV2 } from "@oricube/engine";
import { hc, type InferResponseType } from "hono/client";

/** 同一オリジンの /api を呼ぶ Hono RPC クライアント。開発時は Vite の proxy が API へ転送する */
export const apiClient = hc<AppType>(window.location.origin);

export type ApiClient = typeof apiClient;

/** 作品を取得する。存在しなければ null、それ以外の失敗は例外にする */
export const fetchOrigami = async (client: ApiClient, id: string) => {
  const res = await client.api.models[":id"].$get({ param: { id } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`作品を取得できませんでした（${res.status}）`);
  return res.json();
};

export type OrigamiListResponse = InferResponseType<ApiClient["api"]["models"]["$get"], 200>;
export type OrigamiSummary = OrigamiListResponse["items"][number];

/** 作品の一覧を取得する。q は名前と説明の検索語、page は1始まり */
export const fetchOrigamiList = async (client: ApiClient, { q, page }: { q: string; page: number }): Promise<OrigamiListResponse> => {
  const res = await client.api.models.$get({ query: { ...(q ? { q } : {}), ...(page > 1 ? { page: String(page) } : {}) } });
  if (!res.ok) throw new Error(`作品の一覧を取得できませんでした（${res.status}）`);
  return res.json();
};

/** APIの失敗。status と API の error.code で画面の案内を分ける */
export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const toError = async (res: Response, fallback: string) => {
  const body: unknown = await res.json().catch(() => null);
  const error = typeof body === "object" && body !== null && "error" in body ? (body as { error: { code?: string; message?: string } }).error : undefined;
  return new ApiRequestError(error?.message ?? `${fallback}（${res.status}）`, res.status, error?.code);
};

/** 投稿する作品。IDと編集用の鍵はサーバーが決める */
export interface OrigamiInput {
  name: string;
  description: string;
  color: string;
  procedure: OrigamiModelV2["procedure"];
  stepDescriptions?: string[];
  presentation?: OrigamiModelV2["presentation"];
  /** 公開範囲。省略すると公開 */
  visibility?: Visibility;
}
/** 公開範囲。public は一覧・検索に載り、unlisted はURLを知っている人だけが見られる */
export type Visibility = "public" | "unlisted";
/**
 * 作品を投稿する。turnstileToken は画面の Turnstile が発行したトークン（1回しか使えない）
 *
 * @returns サーバーが決めたIDと、編集・削除に使う鍵（この応答でしか受け取れない）
 */
export const createOrigami = async (client: ApiClient, input: OrigamiInput, turnstileToken: string) => {
  const res = await client.api.models.$post({ json: { ...input, turnstileToken } });
  if (!res.ok) throw await toError(res, "作品を投稿できませんでした");
  const { id, editKey } = await res.json();
  return { id, editKey };
};

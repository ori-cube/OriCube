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

/** 投稿する作品。IDと所有者はサーバーが決める */
export interface OrigamiInput {
  name: string;
  description: string;
  color: string;
  procedure: OrigamiModelV2["procedure"];
  stepDescriptions?: string[];
  presentation?: OrigamiModelV2["presentation"];
}
export type ThumbnailContentType = "image/png" | "image/webp";
export interface ThumbnailUpload { url: string; method: "PUT"; headers: Record<string, string>; expiresAt: string }
export interface PendingOrigami { id: string; thumbnailUpload: ThumbnailUpload }

const thumbnailSpec = (thumbnail: Blob) => {
  if (thumbnail.type !== "image/png" && thumbnail.type !== "image/webp") throw new ApiRequestError("サムネイルはPNGかWebPにしてください。", 400, "invalid_request");
  return { contentType: thumbnail.type as ThumbnailContentType, size: thumbnail.size };
};

/** 作品を公開前（pending）で作り、サムネイルのアップロード先を受け取る */
export const createOrigami = async (client: ApiClient, input: OrigamiInput, thumbnail: Blob): Promise<PendingOrigami> => {
  const res = await client.api.models.$post({ json: { ...input, thumbnail: thumbnailSpec(thumbnail) } });
  if (!res.ok) throw await toError(res, "作品を投稿できませんでした");
  const { id, thumbnailUpload } = await res.json();
  return { id, thumbnailUpload };
};

/** 公開前の作品のアップロード先を作り直す（期限切れ・撮り直し） */
export const renewThumbnailUpload = async (client: ApiClient, id: string, thumbnail: Blob): Promise<PendingOrigami> => {
  const res = await client.api.models[":id"]["thumbnail-upload"].$post({ param: { id }, json: thumbnailSpec(thumbnail) });
  if (!res.ok) throw await toError(res, "サムネイルのアップロード先を作れませんでした");
  const { thumbnailUpload } = await res.json();
  return { id, thumbnailUpload };
};

/** サムネイルを保存先（本番は R2 の presigned URL）へ直接送る。認証情報は付けない */
export const uploadThumbnail = async (target: ThumbnailUpload, thumbnail: Blob) => {
  const res = await fetch(target.url, { method: target.method, headers: target.headers, body: thumbnail, credentials: "omit" });
  if (!res.ok) throw new ApiRequestError(`サムネイルをアップロードできませんでした（${res.status}）`, res.status, "upload_failed");
};

/** サムネイルが置かれたことをサーバーで確かめて公開する。公開済みでも成功する */
export const publishOrigami = async (client: ApiClient, id: string) => {
  const res = await client.api.models[":id"].publish.$post({ param: { id } });
  if (!res.ok) throw await toError(res, "作品を公開できませんでした");
  return res.json();
};

import type { AppType } from "@oricube/api";
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

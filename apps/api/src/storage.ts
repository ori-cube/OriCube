import { Hono } from "hono";
import { apiError } from "./errors";
import { THUMBNAIL_CONTENT_TYPES, type ThumbnailSpec } from "./schema";

/** ブラウザが画像を直接送る先。R2 の presigned URL と同じく、署名したヘッダーを付けて PUT する */
export interface UploadTarget {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  /** ISO 8601 */
  expiresAt: string;
}

/**
 * サムネイルの保存先
 *
 * @description
 * 本番は Cloudflare R2（#100）。画像は API を通さず、presigned URL でブラウザから直接アップロードする。
 * R2 に接続するまではメモリ上の実装（{@link createMemoryThumbnailStorage}）を使う
 */
export interface ThumbnailStorage {
  /** key へ spec どおりの画像を1つ置ける、期限付きのアップロード先を作る */
  createUpload(key: string, spec: ThumbnailSpec): Promise<UploadTarget>;
  /** 置かれた画像の形式とサイズ。無ければ null */
  head(key: string): Promise<ThumbnailSpec | null>;
  delete(key: string): Promise<void>;
  /** 画像を表示するURL。同一オリジンのパスか、公開バケットの絶対URL */
  publicUrl(key: string): string;
  /** 保存先自体が API の下にルートを持つ場合（メモリ上の実装）に /api へ追加する */
  routes?: Hono;
}

const UPLOAD_TTL_MS = 10 * 60 * 1000;
const extensions: Record<ThumbnailSpec["contentType"], string> = { "image/png": "png", "image/webp": "webp" };

/** 作品ごとのサムネイルのキー。推測されないよう毎回別の名前にする */
export const thumbnailKey = (modelId: string, contentType: ThumbnailSpec["contentType"]) =>
  `thumbnails/${modelId}/${crypto.randomUUID()}.${extensions[contentType]}`;

const MOUNT = "/mock-storage";

/**
 * 開発用のメモリ上の保存先
 *
 * @description
 * R2 の presigned URL の代わりに、推測できないトークン付きの `PUT /api/mock-storage/uploads/:token` を返す。
 * 署名と同じく、形式（Content-Type）とサイズ（Content-Length）が投稿時の申告と違えば拒否する。
 * 画像は `GET /api/mock-storage/objects/*` で返す。Workers では isolate ごとのメモリなので永続化されない
 */
export const createMemoryThumbnailStorage = ({ now = () => Date.now() }: { now?: () => number } = {}): ThumbnailStorage => {
  const objects = new Map<string, { spec: ThumbnailSpec; body: ArrayBuffer }>();
  const uploads = new Map<string, { key: string; spec: ThumbnailSpec; expiresAt: number }>();

  const routes = new Hono()
    .put("/uploads/:token", async (c) => {
      const upload = uploads.get(c.req.param("token"));
      if (!upload || upload.expiresAt < now()) return apiError(c, 403, "forbidden", "アップロード先の期限が切れているか、正しくありません。");
      if (c.req.header("Content-Type") !== upload.spec.contentType) return apiError(c, 400, "invalid_request", "画像の形式が申告と違います。");
      const body = await c.req.arrayBuffer();
      if (body.byteLength !== upload.spec.size) return apiError(c, 400, "invalid_request", "画像のサイズが申告と違います。");
      objects.set(upload.key, { spec: upload.spec, body });
      return c.body(null, 200);
    })
    .get("/objects/*", (c) => {
      const object = objects.get(c.req.path.slice(c.req.path.indexOf("/objects/") + "/objects/".length));
      if (!object || !THUMBNAIL_CONTENT_TYPES.includes(object.spec.contentType)) return apiError(c, 404, "not_found", "画像が見つかりません。");
      return c.body(object.body, 200, {
        "Content-Type": object.spec.contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      });
    });

  return {
    createUpload: async (key, spec) => {
      const token = crypto.randomUUID();
      const expiresAt = now() + UPLOAD_TTL_MS;
      uploads.set(token, { key, spec, expiresAt });
      return { url: `/api${MOUNT}/uploads/${token}`, method: "PUT", headers: { "Content-Type": spec.contentType }, expiresAt: new Date(expiresAt).toISOString() };
    },
    head: async (key) => objects.get(key)?.spec ?? null,
    delete: async (key) => {
      objects.delete(key);
    },
    publicUrl: (key) => `/api${MOUNT}/objects/${key}`,
    routes: new Hono().route(MOUNT, routes),
  };
};

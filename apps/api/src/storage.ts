import { Hono } from "hono";
import { z } from "zod";
import { apiError } from "./errors";
import { THUMBNAIL_CONTENT_TYPES, type ThumbnailSpec } from "./schema";

/** ブラウザが画像を直接送る先。R2 の presigned URL と同じく、署名した URL へヘッダーを付けて PUT する */
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
 * 本番は Cloudflare R2（{@link createR2ThumbnailStorage}、#100）。画像は作品の API を通さず、署名付きのアップロード先へブラウザから直接送る。
 * R2 のバインディングが無い環境（Node.js・テスト）はメモリ上の実装（{@link createMemoryThumbnailStorage}）を使う
 */
export interface ThumbnailStorage {
  /** key へ spec どおりの画像を1つ置ける、期限付きのアップロード先を作る */
  createUpload(key: string, spec: ThumbnailSpec): Promise<UploadTarget>;
  /** 置かれた画像の形式とサイズ。無ければ null */
  head(key: string): Promise<ThumbnailSpec | null>;
  delete(key: string): Promise<void>;
  /** 画像を表示するURL。同一オリジンのパスか、公開バケットの絶対URL */
  publicUrl(key: string): string;
  /** アップロード先と画像の配信のルート。/api の下に追加する */
  routes?: Hono;
}

const UPLOAD_TTL_MS = 10 * 60 * 1000;
const extensions: Record<ThumbnailSpec["contentType"], string> = { "image/png": "png", "image/webp": "webp" };

/** 作品ごとのサムネイルのキー。推測されないよう毎回別の名前にする */
export const thumbnailKey = (modelId: string, contentType: ThumbnailSpec["contentType"]) =>
  `thumbnails/${modelId}/${crypto.randomUUID()}.${extensions[contentType]}`;

/**
 * 画像を置く場所。Cloudflare R2 のバインディング（R2Bucket）のうち、使う操作だけを型にする
 *
 * @description
 * Workers の R2Bucket はこの形をそのまま満たす。開発・テストでは {@link createMemoryObjectStore} を使う
 */
export interface ObjectStore {
  put(key: string, body: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  get(key: string): Promise<(StoredObject & { body: ReadableStream | ArrayBuffer }) | null>;
  head(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

interface StoredObject {
  size: number;
  httpMetadata?: { contentType?: string };
}

/** メモリ上の ObjectStore。Workers では isolate ごとのメモリなので永続化されない */
export const createMemoryObjectStore = (): ObjectStore => {
  const objects = new Map<string, { body: ArrayBuffer; contentType: string }>();
  const meta = (object: { body: ArrayBuffer; contentType: string }) => ({ size: object.body.byteLength, httpMetadata: { contentType: object.contentType } });
  return {
    put: async (key, body, { httpMetadata }) => {
      objects.set(key, { body, contentType: httpMetadata.contentType });
    },
    get: async (key) => {
      const object = objects.get(key);
      return object ? { ...meta(object), body: object.body } : null;
    },
    head: async (key) => {
      const object = objects.get(key);
      return object ? meta(object) : null;
    },
    delete: async (key) => {
      objects.delete(key);
    },
  };
};

const encoder = new TextEncoder();
const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (value: string) => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

/** アップロード先のトークンに入れる内容。署名するので、ブラウザは書き換えられない */
const uploadTicketSchema = z.object({ key: z.string(), contentType: z.enum(THUMBNAIL_CONTENT_TYPES), size: z.number().int(), expiresAt: z.number() });
type UploadTicket = z.infer<typeof uploadTicketSchema>;

/** サムネイルのキー。thumbnailKey が作る形だけを受け付け、それ以外のパスは読まない */
const THUMBNAIL_KEY_PATTERN = /^thumbnails\/[A-Za-z0-9_-]{1,64}\/[0-9a-f-]{36}\.(png|webp)$/;

interface SignedUploadStorageOptions {
  objects: ObjectStore;
  /**
   * アップロード先の署名に使う秘密の値。本番は wrangler secret で設定する（32文字以上）
   *
   * 関数なら最初に署名するときに1回だけ呼ぶ。Workers はモジュールの読み込み時（グローバルスコープ）に乱数を作れないため、乱数の値は関数で渡す
   */
  secret: string | (() => string);
  /** /api の下に置くパス */
  mount: string;
  now?: () => number;
}

/**
 * 署名付きのアップロード先を発行する保存先
 *
 * @description
 * R2 の presigned URL と同じく、キー・形式・サイズ・期限を署名したトークン付きの `PUT /api<mount>/uploads/:token` を返す。
 * 受け取った Worker が署名と期限を確かめ、形式（Content-Type）とサイズが申告と違えば拒否してから保存先へ置く。
 * 署名を Worker が確かめるので、S3 互換 API の鍵や追加の依存は要らない。画像は `GET /api<mount>/objects/*` で返す
 */
export const createSignedUploadStorage = ({ objects, secret, mount, now = () => Date.now() }: SignedUploadStorageOptions): ThumbnailStorage => {
  // 鍵は最初に使うときに作る（Workers はグローバルスコープでの非同期処理・乱数を許さず、app.ts はモジュールの読み込み時に createApp する）
  let signingKey: ReturnType<typeof crypto.subtle.importKey> | undefined;
  const getSigningKey = () => signingKey ??= crypto.subtle.importKey("raw", encoder.encode(typeof secret === "function" ? secret() : secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const sign = async (ticket: UploadTicket) => {
    const payload = toBase64Url(encoder.encode(JSON.stringify(ticket)));
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await getSigningKey(), encoder.encode(payload)));
    return `${payload}.${toBase64Url(signature)}`;
  };
  /** 署名が正しく期限内なら中身を返す。比較は crypto.subtle.verify に任せる（時間差で漏らさない） */
  const verify = async (token: string): Promise<UploadTicket | null> => {
    const [payload, signature, ...rest] = token.split(".");
    if (!payload || !signature || rest.length) return null;
    try {
      if (!(await crypto.subtle.verify("HMAC", await getSigningKey(), fromBase64Url(signature), encoder.encode(payload)))) return null;
      const ticket = uploadTicketSchema.safeParse(JSON.parse(new TextDecoder().decode(fromBase64Url(payload))));
      return ticket.success && ticket.data.expiresAt >= now() ? ticket.data : null;
    } catch {
      return null;
    }
  };

  const routes = new Hono()
    .put("/uploads/:token", async (c) => {
      const ticket = await verify(c.req.param("token"));
      if (!ticket) return apiError(c, 403, "forbidden", "アップロード先の期限が切れているか、正しくありません。");
      if (c.req.header("Content-Type") !== ticket.contentType) return apiError(c, 400, "invalid_request", "画像の形式が申告と違います。");
      const body = await c.req.arrayBuffer();
      if (body.byteLength !== ticket.size) return apiError(c, 400, "invalid_request", "画像のサイズが申告と違います。");
      await objects.put(ticket.key, body, { httpMetadata: { contentType: ticket.contentType } });
      return c.body(null, 200);
    })
    .get("/objects/*", async (c) => {
      const key = c.req.path.slice(c.req.path.indexOf("/objects/") + "/objects/".length);
      const object = THUMBNAIL_KEY_PATTERN.test(key) ? await objects.get(key) : null;
      const contentType = object?.httpMetadata?.contentType;
      if (!object || !THUMBNAIL_CONTENT_TYPES.some((type) => type === contentType)) return apiError(c, 404, "not_found", "画像が見つかりません。");
      return c.body(object.body, 200, {
        "Content-Type": contentType as string,
        "Content-Length": String(object.size),
        "X-Content-Type-Options": "nosniff",
        // キーは画像ごとに毎回変わるので、内容は変わらない
        "Cache-Control": "public, max-age=31536000, immutable",
      });
    });

  return {
    createUpload: async (key, spec) => {
      const expiresAt = now() + UPLOAD_TTL_MS;
      const token = await sign({ key, contentType: spec.contentType, size: spec.size, expiresAt });
      return { url: `/api${mount}/uploads/${token}`, method: "PUT", headers: { "Content-Type": spec.contentType }, expiresAt: new Date(expiresAt).toISOString() };
    },
    head: async (key) => {
      const object = await objects.head(key);
      const contentType = THUMBNAIL_CONTENT_TYPES.find((type) => type === object?.httpMetadata?.contentType);
      return object && contentType ? { contentType, size: object.size } : null;
    },
    delete: (key) => objects.delete(key),
    publicUrl: (key) => `/api${mount}/objects/${key}`,
    routes: new Hono().route(mount, routes),
  };
};

/** インスタンスごとの使い捨ての秘密の値。署名するときに1回だけ作る */
const randomSecret = () => toBase64Url(crypto.getRandomValues(new Uint8Array(32)));

/** 署名の秘密の値として受け付ける最短の長さ */
export const MIN_UPLOAD_SECRET_LENGTH = 32;

/**
 * Cloudflare R2 に置く保存先
 *
 * @description
 * アップロード先は `/api/storage/uploads/:token`、画像は `/api/storage/objects/*` で Worker から返す。
 * 署名の秘密の値が無い・短いときは、誰でも書けるアップロード先にしないよう投稿（アップロード先の発行）だけを失敗させ、
 * 保存済みの画像の配信は続ける
 */
export const createR2ThumbnailStorage = (bucket: ObjectStore, secret: string | undefined): ThumbnailStorage => {
  if (secret && secret.length >= MIN_UPLOAD_SECRET_LENGTH) return createSignedUploadStorage({ objects: bucket, secret, mount: "/storage" });
  console.error(`THUMBNAIL_UPLOAD_SECRET が未設定か${MIN_UPLOAD_SECRET_LENGTH}文字未満のため、サムネイルのアップロードを止めています`);
  // 読み出しだけに使うので、署名の値は使い捨ての乱数にする（このトークンは誰にも渡さない）
  const storage = createSignedUploadStorage({ objects: bucket, secret: randomSecret, mount: "/storage" });
  return {
    ...storage,
    createUpload: async () => {
      throw new Error("THUMBNAIL_UPLOAD_SECRET が設定されていません");
    },
  };
};

/**
 * 開発用のメモリ上の保存先
 *
 * @description
 * R2 と同じ署名付きのアップロード先を、`/api/mock-storage` の下に持つ。署名の秘密の値はインスタンスごとに作る。
 * Workers では isolate ごとのメモリなので永続化されない
 */
export const createMemoryThumbnailStorage = ({ now }: { now?: () => number } = {}): ThumbnailStorage =>
  createSignedUploadStorage({
    objects: createMemoryObjectStore(),
    secret: randomSecret,
    mount: "/mock-storage",
    now,
  });

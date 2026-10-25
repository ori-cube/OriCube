import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import { createApp } from "./app";
import type { AuthVerifier } from "./auth";
import { craneProcedure } from "./mocks/crane";
import { createMemoryObjectStore, createMemoryThumbnailStorage, createR2ThumbnailStorage, createSignedUploadStorage, thumbnailKey, type ObjectStore } from "./storage";

const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
const spec = { contentType: "image/png" as const, size: image.byteLength };
const secret = "x".repeat(32);
const key = thumbnailKey("model-1", "image/png");

const put = (storage: ReturnType<typeof createMemoryThumbnailStorage>, url: string, headers: Record<string, string> = { "Content-Type": "image/png" }, body: Uint8Array = image) =>
  createApp({ storage }).request(url, { method: "PUT", headers, body });

describe("Workers のグローバルスコープ", () => {
  it("アプリと保存先を作るときに乱数・鍵を作らない（app.ts はモジュールの読み込み時に createApp する）", () => {
    const random = vi.spyOn(crypto, "getRandomValues");
    const importKey = vi.spyOn(crypto.subtle, "importKey");
    createApp();
    createMemoryThumbnailStorage();
    createR2ThumbnailStorage(createMemoryObjectStore(), undefined);
    createR2ThumbnailStorage(createMemoryObjectStore(), secret);
    expect(random).not.toHaveBeenCalled();
    expect(importKey).not.toHaveBeenCalled();
    random.mockRestore();
    importKey.mockRestore();
  });
});

describe("署名付きのアップロード先", () => {
  it("署名どおりの画像を置き、形式とサイズを返す", async () => {
    const storage = createMemoryThumbnailStorage();
    const { url } = await storage.createUpload(key, spec);
    expect((await put(storage, url)).status).toBe(200);
    expect(await storage.head(key)).toEqual(spec);
  });

  it("書き換えたトークン・別の秘密の値で署名したトークンは拒否する", async () => {
    const storage = createSignedUploadStorage({ objects: createMemoryObjectStore(), secret, mount: "/mock-storage" });
    const { url } = await storage.createUpload(key, spec);
    const token = url.slice(url.lastIndexOf("/") + 1);
    const [payload, signature] = token.split(".");
    // 中身（キー・サイズ）を書き換えると署名が合わない
    const forged = Buffer.from(JSON.stringify({ key: thumbnailKey("other", "image/png"), contentType: "image/png", size: 4, expiresAt: Date.now() + 60_000 })).toString("base64url");
    for (const bad of [`${forged}.${signature}`, `${payload}.${signature.slice(1)}`, payload, `${token}.extra`, "%%%"]) {
      expect((await put(storage, `/api/mock-storage/uploads/${bad}`)).status).toBe(403);
    }
    const other = createSignedUploadStorage({ objects: createMemoryObjectStore(), secret: "y".repeat(32), mount: "/mock-storage" });
    expect((await put(other, url)).status).toBe(403);
    expect(await storage.head(key)).toBeNull();
  });

  it("期限が切れたトークンは拒否する", async () => {
    let now = 0;
    const storage = createMemoryThumbnailStorage({ now: () => now });
    const { url, expiresAt } = await storage.createUpload(key, spec);
    expect(expiresAt).toBe(new Date(10 * 60 * 1000).toISOString());
    now = 10 * 60 * 1000 + 1;
    expect((await put(storage, url)).status).toBe(403);
  });

  it("申告と違う形式・サイズは拒否する", async () => {
    const storage = createMemoryThumbnailStorage();
    const { url } = await storage.createUpload(key, spec);
    expect((await put(storage, url, { "Content-Type": "image/webp" })).status).toBe(400);
    expect((await put(storage, url, undefined, image.slice(1))).status).toBe(400);
  });

  it("メモリ上の置き場所は、キーの辞書順に limit 件ずつ返し、cursor から続ける", async () => {
    const objects = createMemoryObjectStore();
    for (const key of ["thumbnails/b", "thumbnails/a", "thumbnails/c", "other/x"]) await objects.put(key, new ArrayBuffer(1), { httpMetadata: { contentType: "image/png" } });
    const first = await objects.list({ prefix: "thumbnails/", limit: 2 });
    expect(first).toMatchObject({ objects: [{ key: "thumbnails/a" }, { key: "thumbnails/b" }], truncated: true, cursor: "thumbnails/b" });
    expect(await objects.list({ prefix: "thumbnails/", cursor: first.cursor, limit: 2 })).toMatchObject({ objects: [{ key: "thumbnails/c" }], truncated: false });
  });

  it("サムネイルのキーの形でないパスは読まない", async () => {
    const objects = createMemoryObjectStore();
    await objects.put("secret.txt", new ArrayBuffer(1), { httpMetadata: { contentType: "image/png" } });
    const storage = createSignedUploadStorage({ objects, secret, mount: "/mock-storage" });
    const app = createApp({ storage });
    for (const bad of ["secret.txt", "thumbnails/../secret.txt", "thumbnails/a/b.png"]) {
      expect((await app.request(`/api/mock-storage/objects/${bad}`)).status).toBe(404);
    }
  });

  it("R2 の秘密の値が無い・短ければアップロード先を発行せず、保存済みの画像は返す", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const objects = createMemoryObjectStore();
    await objects.put(key, image.buffer, { httpMetadata: { contentType: "image/png" } });
    for (const bad of [undefined, "", "short"]) {
      const storage = createR2ThumbnailStorage(objects, bad);
      await expect(storage.createUpload(key, spec)).rejects.toThrow(/THUMBNAIL_UPLOAD_SECRET/);
      expect(await storage.head(key)).toEqual(spec);
      expect((await createApp({ storage }).request(storage.publicUrl(key))).status).toBe(200);
    }
    expect(error).toHaveBeenCalledWith(expect.stringContaining("THUMBNAIL_UPLOAD_SECRET"));
    error.mockRestore();
  });
});

describe("R2（wrangler のローカル環境）", () => {
  let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ THUMBNAILS: ObjectStore }>>>;
  beforeAll(async () => {
    proxy = await getPlatformProxy<{ THUMBNAILS: ObjectStore }>({ configPath: path.resolve(import.meta.dirname, "../wrangler.jsonc"), persist: false });
  }, 60_000);
  afterAll(async () => {
    await proxy?.dispose();
  });

  it("R2 に置いた画像を一覧でき、続きは cursor で読む", async () => {
    const storage = createR2ThumbnailStorage(proxy.env.THUMBNAILS, secret);
    const app = createApp({ storage });
    const keys = [thumbnailKey("list-a", "image/png"), thumbnailKey("list-b", "image/png")];
    for (const key of keys) {
      const { url } = await storage.createUpload(key, spec);
      expect((await app.request(url, { method: "PUT", headers: { "Content-Type": "image/png" }, body: image })).status).toBe(200);
    }
    const { objects } = await storage.list();
    expect(objects.map((object) => object.key)).toEqual(expect.arrayContaining(keys));
    expect(objects.every((object) => object.uploaded instanceof Date)).toBe(true);
    for (const key of keys) await storage.delete(key);
  });

  it("投稿・アップロード・公開・配信・削除が R2 で通る", async () => {
    const auth: AuthVerifier = { authenticate: async (request) => request.headers.get("x-test-user") };
    const app = createApp({ auth, storage: createR2ThumbnailStorage(proxy.env.THUMBNAILS, secret) });
    const headers = { "Content-Type": "application/json", "x-test-user": "user_a" };
    const input = { name: "R2の鶴", description: "", color: "#ed7070", procedure: craneProcedure, thumbnail: spec };
    const created = await app.request("/api/models", { method: "POST", headers, body: JSON.stringify(input) });
    const { id, thumbnailUpload } = (await created.json()) as { id: string; thumbnailUpload: { url: string; headers: Record<string, string> } };
    expect(thumbnailUpload.url).toMatch(/^\/api\/storage\/uploads\//);
    expect((await app.request(thumbnailUpload.url, { method: "PUT", headers: thumbnailUpload.headers, body: image })).status).toBe(200);
    expect((await app.request(`/api/models/${id}/publish`, { method: "POST", headers })).status).toBe(200);

    const { items } = (await (await app.request("/api/models?q=R2")).json()) as { items: { thumbnailUrl: string }[] };
    const res = await app.request(items[0].thumbnailUrl);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(image);

    expect((await app.request(`/api/models/${id}`, { method: "DELETE", headers })).status).toBe(204);
    expect((await app.request(items[0].thumbnailUrl)).status).toBe(404);
  });
});

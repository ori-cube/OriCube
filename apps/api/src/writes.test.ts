import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { AuthVerifier } from "./auth";
import { craneProcedure } from "./mocks/crane";
import { createMemoryThumbnailStorage } from "./storage";

/** テスト用: x-test-user ヘッダーの値をログイン中のユーザーIDとして扱う */
const auth: AuthVerifier = { authenticate: async (request) => request.headers.get("x-test-user") };
const input = { name: "テストの鶴", description: "説明", color: "#ed7070", procedure: craneProcedure };
const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
const thumbnail = { contentType: "image/png", size: image.byteLength };
const send = (app: ReturnType<typeof createApp>, method: string, path: string, { user, body }: { user?: string; body?: unknown } = {}) =>
  app.request(path, {
    method,
    headers: { "Content-Type": "application/json", ...(user ? { "x-test-user": user } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
interface Created { id: string; status: string; thumbnailUpload: { url: string; method: string; headers: Record<string, string> } }
const createPending = async (app: ReturnType<typeof createApp>, user = "user_a") => {
  const res = await send(app, "POST", "/api/models", { user, body: { ...input, thumbnail } });
  expect(res.status).toBe(201);
  return (await res.json()) as Created;
};
const upload = (app: ReturnType<typeof createApp>, target: Created["thumbnailUpload"], body: Uint8Array = image) =>
  app.request(target.url, { method: target.method, headers: target.headers, body });
/** 投稿・サムネイルのアップロード・公開までを行う */
const create = async (app: ReturnType<typeof createApp>, user = "user_a") => {
  const { id, thumbnailUpload } = await createPending(app, user);
  expect((await upload(app, thumbnailUpload)).status).toBe(200);
  expect((await send(app, "POST", `/api/models/${id}/publish`, { user })).status).toBe(200);
  return id;
};

describe("POST /api/models", () => {
  it("未ログインは401", async () => {
    const res = await send(createApp({ auth }), "POST", "/api/models", { body: input });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "unauthorized" } });
  });

  it("作品の内容が不正なら400", async () => {
    const res = await send(createApp({ auth }), "POST", "/api/models", { user: "user_a", body: { ...input, thumbnail, procedure: { ...craneProcedure, size: 0 } } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "invalid_request" } });
  });

  it("完成形を見せる向きを保存して返し、単位クォータニオンでなければ400", async () => {
    const app = createApp({ auth });
    const rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
    const bad = await send(app, "POST", "/api/models", { user: "user_a", body: { ...input, thumbnail, presentation: { rotation: [0, 0, 0, 2] } } });
    expect(bad.status).toBe(400);
    const res = await send(app, "POST", "/api/models", { user: "user_a", body: { ...input, thumbnail, presentation: { rotation } } });
    const { id, thumbnailUpload } = (await res.json()) as Created;
    await upload(app, thumbnailUpload);
    await send(app, "POST", `/api/models/${id}/publish`, { user: "user_a" });
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ presentation: { rotation } });
  });

  it("サムネイルの形式・サイズが不正なら400", async () => {
    const app = createApp({ auth });
    for (const bad of [undefined, { contentType: "image/svg+xml", size: 10 }, { contentType: "image/png", size: 512 * 1024 + 1 }, { contentType: "image/png", size: 0 }]) {
      const res = await send(app, "POST", "/api/models", { user: "user_a", body: { ...input, thumbnail: bad } });
      expect(res.status).toBe(400);
    }
  });

  it("IDをサーバーで決めて保存し、公開後に取得できる", async () => {
    const app = createApp({ auth });
    const id = await create(app);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const res = await app.request(`/api/models/${id}`);
    expect(await res.json()).toMatchObject({ id, name: "テストの鶴" });
  });

  it("クライアントが送ったIDは使わない", async () => {
    const app = createApp({ auth });
    const res = await send(app, "POST", "/api/models", { user: "user_a", body: { ...input, thumbnail, id: "crane" } });
    const { id } = (await res.json()) as { id: string };
    expect(id).not.toBe("crane");
    expect(await (await app.request("/api/models/crane")).json()).toMatchObject({ name: "鶴" });
  });

  it("他サイトからのフォーム送信はOriginで拒否する", async () => {
    const res = await createApp({ auth }).request("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://evil.example", "x-test-user": "user_a" },
      body: "name=x",
    });
    expect(res.status).toBe(403);
  });
});

describe("PUT・DELETE /api/models/:id", () => {
  it("所有者だけが更新できる", async () => {
    const app = createApp({ auth });
    const id = await create(app);
    expect((await send(app, "PUT", `/api/models/${id}`, { body: { ...input, name: "x" } })).status).toBe(401);
    const other = await send(app, "PUT", `/api/models/${id}`, { user: "user_b", body: { ...input, name: "乗っ取り" } });
    expect(other.status).toBe(403);
    expect(await other.json()).toMatchObject({ error: { code: "forbidden" } });
    expect((await send(app, "PUT", `/api/models/${id}`, { user: "user_a", body: { ...input, name: "更新した鶴" } })).status).toBe(200);
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ id, name: "更新した鶴" });
  });

  it("所有者だけが削除でき、削除後は404", async () => {
    const app = createApp({ auth });
    const id = await create(app);
    expect((await send(app, "DELETE", `/api/models/${id}`, { user: "user_b" })).status).toBe(403);
    expect((await send(app, "DELETE", `/api/models/${id}`, { user: "user_a" })).status).toBe(204);
    expect((await app.request(`/api/models/${id}`)).status).toBe(404);
    expect((await send(app, "DELETE", `/api/models/${id}`, { user: "user_a" })).status).toBe(404);
  });

  it("所有者のいないモックは誰も変更・削除できない", async () => {
    const app = createApp({ auth });
    expect((await send(app, "PUT", "/api/models/crane", { user: "user_a", body: input })).status).toBe(403);
    expect((await send(app, "DELETE", "/api/models/crane", { user: "user_a" })).status).toBe(403);
  });
});

describe("サムネイルのアップロードと公開", () => {
  it("公開するまでは取得・一覧・作品ページに出さない", async () => {
    const app = createApp({ auth });
    const { id, status } = await createPending(app);
    expect(status).toBe("pending");
    expect((await app.request(`/api/models/${id}`)).status).toBe(404);
    const list = (await (await app.request("/api/models")).json()) as { items: { id: string }[] };
    expect(list.items.map((item) => item.id)).not.toContain(id);
  });

  it("サムネイルを置く前の公開は409", async () => {
    const app = createApp({ auth });
    const { id } = await createPending(app);
    const res = await send(app, "POST", `/api/models/${id}/publish`, { user: "user_a" });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: { code: "conflict" } });
  });

  it("申告と違う形式・サイズの画像はアップロード先が拒否する", async () => {
    const app = createApp({ auth });
    const { thumbnailUpload } = await createPending(app);
    expect((await upload(app, thumbnailUpload, image.slice(1))).status).toBe(400);
    expect((await app.request(thumbnailUpload.url, { method: "PUT", headers: { "Content-Type": "image/webp" }, body: image })).status).toBe(400);
    expect((await app.request("/api/mock-storage/uploads/unknown", { method: "PUT", headers: thumbnailUpload.headers, body: image })).status).toBe(403);
  });

  it("アップロード先は期限が切れると使えない", async () => {
    let now = 0;
    const app = createApp({ auth, storage: createMemoryThumbnailStorage({ now: () => now }) });
    const { thumbnailUpload } = await createPending(app);
    now = 10 * 60 * 1000 + 1;
    expect((await upload(app, thumbnailUpload)).status).toBe(403);
  });

  it("公開後は一覧にサムネイル付きで並び、画像を返す。公開は再試行できる", async () => {
    const app = createApp({ auth });
    const id = await create(app);
    expect(await (await send(app, "POST", `/api/models/${id}/publish`, { user: "user_a" })).json()).toEqual({ id, status: "published" });
    const { items } = (await (await app.request("/api/models")).json()) as { items: { id: string; name: string; thumbnailUrl: string | null }[] };
    expect(items[0]).toMatchObject({ id, name: "テストの鶴" });
    expect(items.find((item) => item.id === "crane")).toMatchObject({ thumbnailUrl: null });
    const res = await app.request(items[0].thumbnailUrl ?? "");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(image);
  });

  it("公開前ならアップロード先を作り直せる。古い画像は消える", async () => {
    const app = createApp({ auth });
    const first = await createPending(app);
    expect((await upload(app, first.thumbnailUpload)).status).toBe(200);
    expect((await send(app, "POST", `/api/models/${first.id}/thumbnail-upload`, { user: "user_b", body: thumbnail })).status).toBe(403);
    const res = await send(app, "POST", `/api/models/${first.id}/thumbnail-upload`, { user: "user_a", body: thumbnail });
    expect(res.status).toBe(200);
    const second = (await res.json()) as Created;
    expect(second.thumbnailUpload.url).not.toBe(first.thumbnailUpload.url);
    // 作り直した先に置くまでは公開できない
    expect((await send(app, "POST", `/api/models/${first.id}/publish`, { user: "user_a" })).status).toBe(409);
    expect((await upload(app, second.thumbnailUpload)).status).toBe(200);
    expect((await send(app, "POST", `/api/models/${first.id}/publish`, { user: "user_a" })).status).toBe(200);
    expect((await send(app, "POST", `/api/models/${first.id}/thumbnail-upload`, { user: "user_a", body: thumbnail })).status).toBe(409);
  });

  it("他人の作品は公開できない", async () => {
    const app = createApp({ auth });
    const { id, thumbnailUpload } = await createPending(app);
    await upload(app, thumbnailUpload);
    expect((await send(app, "POST", `/api/models/${id}/publish`)).status).toBe(401);
    expect((await send(app, "POST", `/api/models/${id}/publish`, { user: "user_b" })).status).toBe(403);
  });

  it("作品を削除するとサムネイルも消える", async () => {
    const app = createApp({ auth });
    const id = await create(app);
    const { items } = (await (await app.request("/api/models")).json()) as { items: { id: string; thumbnailUrl: string }[] };
    const url = items.find((item) => item.id === id)?.thumbnailUrl ?? "";
    expect((await send(app, "DELETE", `/api/models/${id}`, { user: "user_a" })).status).toBe(204);
    expect((await app.request(url)).status).toBe(404);
  });
});

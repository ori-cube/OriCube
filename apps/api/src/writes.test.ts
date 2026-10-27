import { describe, expect, it, vi } from "vitest";
import { createApp, type AppOptions } from "./app";
import { EDIT_KEY_HEADER } from "./editKey";
import type { HumanVerifier } from "./humanCheck";
import { craneProcedure } from "./mocks/crane";
import { createMockOrigamiRepository } from "./repository";

/** テスト用: トークンが "human" なら人として扱う */
const human: HumanVerifier = { verify: async (token) => token === "human" };
const appWith = (options: AppOptions = {}) => createApp({ human, ...options });
const input = { name: "テストの鶴", description: "説明", color: "#ed7070", procedure: craneProcedure };
const send = (app: ReturnType<typeof createApp>, method: string, path: string, { editKey, body, ip }: { editKey?: string; body?: unknown; ip?: string } = {}) =>
  app.request(path, {
    method,
    headers: { "Content-Type": "application/json", ...(editKey ? { [EDIT_KEY_HEADER]: editKey } : {}), ...(ip ? { "CF-Connecting-IP": ip } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
/** 投稿して作品IDと編集用の鍵を返す */
const create = async (app: ReturnType<typeof createApp>, overrides: Record<string, unknown> = {}) => {
  const res = await send(app, "POST", "/api/models", { body: { ...input, turnstileToken: "human", ...overrides } });
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; editKey: string };
};

describe("POST /api/models", () => {
  it("ログインなしで投稿でき、編集用の鍵を1回だけ返す", async () => {
    const app = appWith();
    const { id, editKey } = await create(app);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(editKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const res = await app.request(`/api/models/${id}`);
    expect(await res.json()).toMatchObject({ id, name: "テストの鶴" });
    expect(JSON.stringify(await (await app.request(`/api/models/${id}`)).json())).not.toContain(editKey);
  });

  it("人であることを確かめられなければ403", async () => {
    for (const turnstileToken of ["bot", ""]) {
      const res = await send(appWith(), "POST", "/api/models", { body: { ...input, turnstileToken } });
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ error: { code: "verification_failed" } });
    }
    // トークンが無い投稿は形式の誤り
    expect((await send(appWith(), "POST", "/api/models", { body: input })).status).toBe(400);
  });

  it("検証の設定が無ければ投稿をすべて拒否する", async () => {
    const res = await send(createApp(), "POST", "/api/models", { body: { ...input, turnstileToken: "human" } });
    expect(res.status).toBe(403);
  });

  it("検証には接続元の IP を渡す", async () => {
    const verify = vi.fn(async () => true);
    await send(appWith({ human: { verify } }), "POST", "/api/models", { body: { ...input, turnstileToken: "t" }, ip: "203.0.113.1" });
    expect(verify).toHaveBeenCalledWith("t", "203.0.113.1");
  });

  it("接続元ごとの上限を超えたら429にし、作品を作らない", async () => {
    const counts = new Map<string, number>();
    const postLimiter = { limit: async (key: string) => { counts.set(key, (counts.get(key) ?? 0) + 1); return (counts.get(key) ?? 0) <= 1; } };
    const app = appWith({ postLimiter });
    const body = { ...input, name: "連投の鶴", turnstileToken: "human" };
    expect((await send(app, "POST", "/api/models", { body, ip: "203.0.113.1" })).status).toBe(201);
    const limited = await send(app, "POST", "/api/models", { body, ip: "203.0.113.1" });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ error: { code: "rate_limited" } });
    expect((await send(app, "POST", "/api/models", { body, ip: "203.0.113.2" })).status).toBe(201);
    const list = (await (await app.request(`/api/models?q=${encodeURIComponent("連投")}`)).json()) as { total: number };
    expect(list.total).toBe(2);
  });

  it("作品の内容が不正なら400", async () => {
    const res = await send(appWith(), "POST", "/api/models", { body: { ...input, turnstileToken: "human", procedure: { ...craneProcedure, size: 0 } } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "invalid_request" } });
  });

  it("完成形を見せる向きを保存して返し、単位クォータニオンでなければ400", async () => {
    const app = appWith();
    const rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
    const bad = await send(app, "POST", "/api/models", { body: { ...input, turnstileToken: "human", presentation: { rotation: [0, 0, 0, 2] } } });
    expect(bad.status).toBe(400);
    const { id } = await create(app, { presentation: { rotation } });
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ presentation: { rotation } });
  });

  it("クライアントが送ったIDは使わない", async () => {
    const app = appWith();
    const { id } = await create(app, { id: "crane" });
    expect(id).not.toBe("crane");
    expect(await (await app.request("/api/models/crane")).json()).toMatchObject({ name: "鶴" });
  });

  it("他サイトからのフォーム送信はOriginで拒否する", async () => {
    const res = await appWith().request("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://evil.example" },
      body: "name=x",
    });
    expect(res.status).toBe(403);
  });
});

describe("PUT・DELETE /api/models/:id", () => {
  it("編集用の鍵を持つ人だけが更新できる", async () => {
    const app = appWith();
    const { id, editKey } = await create(app);
    const missing = await send(app, "PUT", `/api/models/${id}`, { body: { ...input, name: "x" } });
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ error: { code: "unauthorized" } });
    const other = await send(app, "PUT", `/api/models/${id}`, { editKey: (await create(app)).editKey, body: { ...input, name: "乗っ取り" } });
    expect(other.status).toBe(403);
    expect(await other.json()).toMatchObject({ error: { code: "forbidden" } });
    expect((await send(app, "PUT", `/api/models/${id}`, { editKey, body: { ...input, name: "更新した鶴" } })).status).toBe(200);
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ id, name: "更新した鶴" });
  });

  it("編集用の鍵を持つ人だけが削除でき、削除後は404", async () => {
    const app = appWith();
    const { id, editKey } = await create(app);
    expect((await send(app, "DELETE", `/api/models/${id}`, { editKey: "wrong" })).status).toBe(403);
    expect((await send(app, "DELETE", `/api/models/${id}`, { editKey })).status).toBe(204);
    expect((await app.request(`/api/models/${id}`)).status).toBe(404);
    expect((await send(app, "DELETE", `/api/models/${id}`, { editKey })).status).toBe(404);
  });

  it("鍵の無いモックは誰も変更・削除できない", async () => {
    const app = appWith();
    expect((await send(app, "PUT", "/api/models/crane", { editKey: "any", body: input })).status).toBe(403);
    expect((await send(app, "DELETE", "/api/models/crane", { editKey: "any" })).status).toBe(403);
  });

  it("更新・削除も接続元ごとの上限を超えたら429", async () => {
    const app = appWith({ writeLimiter: { limit: async () => false } });
    const { id, editKey } = await create(app);
    expect((await send(app, "DELETE", `/api/models/${id}`, { editKey })).status).toBe(429);
    expect((await app.request(`/api/models/${id}`)).status).toBe(200);
  });
});

describe("GET /api/models/:id/thumbnail.png", () => {
  it("投稿した作品の完成形を手順から描いて PNG で返す", async () => {
    const app = appWith();
    const { id } = await create(app);
    const res = await app.request(`/api/models/${id}/thumbnail.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect([...new Uint8Array(await res.arrayBuffer()).slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("Cache API があれば、描いた画像を使い回す", async () => {
    const stored = new Map<string, Response>();
    vi.stubGlobal("caches", { open: async () => ({ match: async (key: string) => stored.get(key)?.clone(), put: async (key: string, res: Response) => { stored.set(key, res); } }) });
    const repository = createMockOrigamiRepository();
    const findById = vi.spyOn(repository, "findById");
    const app = createApp({ repository });
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => pending.push(promise), passThroughOnException: () => {}, props: {} };
    const first = await app.request("/api/models/crane/thumbnail.png", {}, undefined, ctx);
    await Promise.all(pending);
    const second = await app.request("/api/models/crane/thumbnail.png", {}, undefined, ctx);
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(new Uint8Array(await first.arrayBuffer()));
    expect(second.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(findById).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("無い作品・削除した作品は404", async () => {
    const app = appWith();
    const { id, editKey } = await create(app);
    expect((await send(app, "DELETE", `/api/models/${id}`, { editKey })).status).toBe(204);
    expect((await app.request(`/api/models/${id}/thumbnail.png`)).status).toBe(404);
    expect((await app.request("/api/models/unknown/thumbnail.png")).status).toBe(404);
  });
});

describe("公開範囲", () => {
  it("限定公開の作品はURLで見られるが、一覧と検索には出ない", async () => {
    const app = appWith();
    const { id } = await create(app, { name: "ひみつの鶴", visibility: "unlisted" });
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ id, visibility: "unlisted" });
    const list = (await (await app.request("/api/models?q=ひみつ")).json()) as { items: unknown[]; total: number };
    expect(list.total).toBe(0);
  });

  it("公開範囲を省略すると公開にし、不正な値は400にする", async () => {
    const app = appWith();
    const { id } = await create(app);
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ visibility: "public" });
    expect((await send(app, "POST", "/api/models", { body: { ...input, turnstileToken: "human", visibility: "private" } })).status).toBe(400);
  });
});

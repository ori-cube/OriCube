import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { AuthVerifier } from "./auth";
import { craneProcedure } from "./mocks/crane";

/** テスト用: x-test-user ヘッダーの値をログイン中のユーザーIDとして扱う */
const auth: AuthVerifier = { authenticate: async (request) => request.headers.get("x-test-user") };
const input = { name: "テストの鶴", description: "説明", color: "#ed7070", procedure: craneProcedure };
const send = (app: ReturnType<typeof createApp>, method: string, path: string, { user, body }: { user?: string; body?: unknown } = {}) =>
  app.request(path, {
    method,
    headers: { "Content-Type": "application/json", ...(user ? { "x-test-user": user } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const create = async (app: ReturnType<typeof createApp>, user = "user_a") => {
  const res = await send(app, "POST", "/api/models", { user, body: input });
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
};

describe("POST /api/models", () => {
  it("未ログインは401", async () => {
    const res = await send(createApp({ auth }), "POST", "/api/models", { body: input });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "unauthorized" } });
  });

  it("作品の内容が不正なら400", async () => {
    const res = await send(createApp({ auth }), "POST", "/api/models", { user: "user_a", body: { ...input, procedure: { ...craneProcedure, size: 0 } } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "invalid_request" } });
  });

  it("IDをサーバーで決めて保存し、取得できる", async () => {
    const app = createApp({ auth });
    const id = await create(app);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const res = await app.request(`/api/models/${id}`);
    expect(await res.json()).toMatchObject({ id, name: "テストの鶴" });
  });

  it("クライアントが送ったIDは使わない", async () => {
    const app = createApp({ auth });
    const res = await send(app, "POST", "/api/models", { user: "user_a", body: { ...input, id: "crane" } });
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

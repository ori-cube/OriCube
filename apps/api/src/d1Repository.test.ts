import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getTableColumns } from "drizzle-orm";
import { ENGINE_VERSION } from "@oricube/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { createApp } from "./app";
import type { AuthVerifier } from "./auth";
import { createD1OrigamiRepository, type D1Database } from "./d1Repository";
import { models } from "./db/schema";
import { craneProcedure } from "./mocks/crane";
import { createMemoryThumbnailStorage } from "./storage";
import { withMockFallback } from "./repository";

const apiDir = path.resolve(import.meta.dirname, "..");
let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;

/** migrations/ の SQL を番号順に適用する（wrangler d1 migrations apply と同じ順序） */
const applyMigrations = async (database: D1Database) => {
  const dir = path.join(apiDir, "migrations");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    const statements = readFileSync(path.join(dir, file), "utf8")
      .replace(/--.*$/gm, "")
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) await database.prepare(statement).run();
  }
};

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({ configPath: path.join(apiDir, "wrangler.jsonc"), persist: false });
  db = proxy.env.DB;
  await applyMigrations(db);
}, 60_000);
afterAll(async () => {
  await proxy?.dispose();
});

const auth: AuthVerifier = { authenticate: async (request) => request.headers.get("x-test-user") };
const input = { name: "D1の鶴", description: "説明", color: "#ed7070", procedure: craneProcedure, stepDescriptions: ["半分に折る"], visibility: "public" as const };

describe("D1のスキーマ", () => {
  it("migrations の列と Drizzle のテーブル定義が一致する", async () => {
    const { results } = (await db.prepare("PRAGMA table_info(models)").all()) as { results: { name: string; notnull: number }[] };
    const fromSql = Object.fromEntries(results.map((column) => [column.name, column.notnull === 1]));
    const fromDrizzle = Object.fromEntries(Object.values(getTableColumns(models)).map((column) => [column.name, column.notNull || column.primary]));
    expect(fromSql).toEqual(fromDrizzle);
  });
});

describe("createD1OrigamiRepository", () => {
  it("指定した時刻より前の公開前の作品だけを、古い順に返す", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "owner_p", status: "pending", thumbnail: null, model: { id: "p-old", ...input } });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repository.create({ ownerId: "owner_p", status: "pending", thumbnail: null, model: { id: "p-new", ...input } });
    await repository.create({ ownerId: "owner_p", status: "published", thumbnail: null, model: { id: "p-done", ...input } });
    const ids = (records: { model: unknown }[]) => records.map((record) => (record.model as { id: string }).id);
    expect(ids(await repository.listPendingBefore(new Date(Date.now() + 1000), 10))).toEqual(["p-old", "p-new"]);
    expect(ids(await repository.listPendingBefore(new Date(Date.now() + 1000), 1))).toEqual(["p-old"]);
    expect(ids(await repository.listPendingBefore(new Date(0), 10))).toEqual([]);
    for (const id of ["p-old", "p-new", "p-done"]) await repository.delete(id);
  });

  it("所有者ごとの作品を、公開前も含めて新しい順に返す", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "owner_x", status: "published", thumbnail: null, model: { id: "x-old", ...input } });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repository.create({ ownerId: "owner_x", status: "pending", thumbnail: null, model: { id: "x-new", ...input } });
    await repository.create({ ownerId: "owner_y", status: "published", thumbnail: null, model: { id: "y-one", ...input } });
    expect((await repository.listByOwner("owner_x")).map((record) => [(record.model as { id: string }).id, record.status])).toEqual([["x-new", "pending"], ["x-old", "published"]]);
    for (const id of ["x-old", "x-new", "y-one"]) await repository.delete(id);
  });

  it("作品を保存・取得・更新・削除できる", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "user_a", status: "published", thumbnail: null, model: { id: "d1-crane", ...input } });
    expect(await repository.findById("d1-crane")).toEqual({ ownerId: "user_a", status: "published", thumbnail: null, model: { id: "d1-crane", ...input } });
    await repository.update("d1-crane", { model: { id: "d1-crane", ...input, name: "更新した鶴", stepDescriptions: undefined } });
    const updated = await repository.findById("d1-crane");
    expect(updated?.model).toMatchObject({ name: "更新した鶴" });
    expect(updated?.model).not.toHaveProperty("stepDescriptions");
    await repository.delete("d1-crane");
    expect(await repository.findById("d1-crane")).toBeNull();
  });

  it("公開状態・サムネイル・見せる向きを保存し、一覧には公開済みだけを返す", async () => {
    const repository = createD1OrigamiRepository(db);
    const thumbnail = { key: "thumbnails/d1-pending/a.png", contentType: "image/png" as const, size: 8 };
    const presentation = { rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2] as [number, number, number, number] };
    await repository.create({ ownerId: "user_a", status: "pending", thumbnail, model: { id: "d1-pending", ...input, presentation } });
    expect(await repository.findById("d1-pending")).toEqual({ ownerId: "user_a", status: "pending", thumbnail, model: { id: "d1-pending", ...input, presentation } });
    expect((await repository.list()).map((record) => (record.model as { id: string }).id)).not.toContain("d1-pending");
    const replaced = { ...thumbnail, key: "thumbnails/d1-pending/b.png" };
    await repository.update("d1-pending", { thumbnail: replaced });
    await repository.update("d1-pending", { status: "published" });
    expect(await repository.findById("d1-pending")).toMatchObject({ status: "published", thumbnail: replaced, model: { name: "D1の鶴", presentation } });
    expect((await repository.list()).map((record) => (record.model as { id: string }).id)).toContain("d1-pending");
    await repository.delete("d1-pending");
  });
});

describe("保存時の版", () => {
  it("公開範囲・データ形式・エンジンの版を記録する", async () => {
    await createD1OrigamiRepository(db).create({ ownerId: "user_a", status: "published", thumbnail: null, model: { id: "versioned", ...input, visibility: "unlisted" } });
    const row = await db.prepare("SELECT visibility, format_version, engine_version FROM models WHERE id = ?").bind("versioned").first();
    expect(row).toEqual({ visibility: "unlisted", format_version: 2, engine_version: ENGINE_VERSION });
  });
});

describe("APIとD1", () => {
  it("投稿した作品をサムネイルの確定後にD1から読み、所有者だけが更新できる", async () => {
    const app = createApp({ repository: withMockFallback(createD1OrigamiRepository(db)), auth, storage: createMemoryThumbnailStorage() });
    const headers = (user: string) => ({ "Content-Type": "application/json", "x-test-user": user });
    const image = new Uint8Array(8);
    const created = await app.request("/api/models", { method: "POST", headers: headers("user_a"), body: JSON.stringify({ ...input, thumbnail: { contentType: "image/png", size: image.byteLength } }) });
    expect(created.status).toBe(201);
    const { id, thumbnailUpload } = (await created.json()) as { id: string; thumbnailUpload: { url: string; headers: Record<string, string> } };
    expect((await app.request(`/api/models/${id}`)).status).toBe(404);
    expect((await app.request(thumbnailUpload.url, { method: "PUT", headers: thumbnailUpload.headers, body: image })).status).toBe(200);
    expect((await app.request(`/api/models/${id}/publish`, { method: "POST", headers: headers("user_a") })).status).toBe(200);
    expect(await (await app.request(`/api/models/${id}`)).json()).toEqual({ id, ...input });
    const listed = (await (await app.request("/api/models")).json()) as { items: { id: string; thumbnailUrl: string | null }[] };
    expect(listed.items.find((item) => item.id === id)?.thumbnailUrl).toContain(`/thumbnails/${id}/`);
    expect((await app.request(`/api/models/${id}`, { method: "PUT", headers: headers("user_b"), body: JSON.stringify(input) })).status).toBe(403);
    expect((await app.request(`/api/models/${id}`, { method: "DELETE", headers: headers("user_a") })).status).toBe(204);
  });

  it("一覧はD1の作品を新しい順に並べ、そのあとにモックを並べる", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "user_a", status: "published", thumbnail: null, model: { id: "d1-old", ...input, name: "古い作品" } });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repository.create({ ownerId: "user_a", status: "published", thumbnail: null, model: { id: "d1-new", ...input, name: "新しい作品" } });
    const app = createApp({ repository: withMockFallback(repository), auth });
    const body = (await (await app.request("/api/models")).json()) as { items: { id: string }[] };
    expect(body.items.map((item) => item.id)).toEqual(["d1-new", "d1-old", "crane", "blank-paper"]);
    const searched = (await (await app.request(`/api/models?q=${encodeURIComponent("古い")}`)).json()) as { items: { id: string }[] };
    expect(searched.items.map((item) => item.id)).toEqual(["d1-old"]);
    await repository.delete("d1-old");
    await repository.delete("d1-new");
  });

  it("D1に無い鶴のモックは読めるが、変更できない", async () => {
    const app = createApp({ repository: withMockFallback(createD1OrigamiRepository(db)), auth });
    expect(await (await app.request("/api/models/crane")).json()).toMatchObject({ id: "crane", name: "鶴" });
    const res = await app.request("/api/models/crane", { method: "PUT", headers: { "Content-Type": "application/json", "x-test-user": "user_a" }, body: JSON.stringify(input) });
    expect(res.status).toBe(403);
  });
});

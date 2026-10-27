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
  it("作品を保存・取得・更新・削除できる", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "user_a", model: { id: "d1-crane", ...input } });
    expect(await repository.findById("d1-crane")).toEqual({ ownerId: "user_a", model: { id: "d1-crane", ...input } });
    await repository.update("d1-crane", { id: "d1-crane", ...input, name: "更新した鶴", stepDescriptions: undefined });
    const updated = await repository.findById("d1-crane");
    expect(updated?.model).toMatchObject({ name: "更新した鶴" });
    expect(updated?.model).not.toHaveProperty("stepDescriptions");
    await repository.delete("d1-crane");
    expect(await repository.findById("d1-crane")).toBeNull();
  });

  it("完成形を見せる向きを保存する", async () => {
    const repository = createD1OrigamiRepository(db);
    const presentation = { rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2] as [number, number, number, number] };
    await repository.create({ ownerId: "user_a", model: { id: "d1-presented", ...input, presentation } });
    expect(await repository.findById("d1-presented")).toEqual({ ownerId: "user_a", model: { id: "d1-presented", ...input, presentation } });
    await repository.delete("d1-presented");
  });
});

describe("一覧の要約", () => {
  const ids = (result: { items: { id: string }[] }) => result.items.map((item) => item.id);

  it("投稿・更新のときに要約を保存し、一覧は手順を読まずに返す", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "user_a", model: { id: "summary", ...input, name: "ＡＢＣの鶴" } });
    const row = await db.prepare("SELECT step_count, thumbnail, search_text FROM models WHERE id = ?").bind("summary").first<{ step_count: number; thumbnail: string; search_text: string }>();
    expect(row?.step_count).toBeGreaterThan(0);
    expect(JSON.parse(row?.thumbnail ?? "null")).toMatchObject({ faces: expect.any(Array) });
    expect(row?.search_text).toBe("abcの鶴\n説明");
    const listed = await repository.listPublic({ keyword: "abc", offset: 0, limit: 10 });
    expect(listed).toMatchObject({ total: 1, items: [{ id: "summary", name: "ＡＢＣの鶴", stepCount: row?.step_count }] });
    await repository.update("summary", { id: "summary", ...input, name: "更新した鶴" });
    expect(ids(await repository.listPublic({ keyword: "abc", offset: 0, limit: 10 }))).toEqual([]);
    expect(ids(await repository.listPublic({ keyword: "更新", offset: 0, limit: 10 }))).toEqual(["summary"]);
    await repository.delete("summary");
  });

  it("件数と切り出しを D1 で行い、限定公開は数えない", async () => {
    const repository = createD1OrigamiRepository(db);
    for (const [index, visibility] of (["public", "public", "public", "unlisted"] as const).entries()) {
      await repository.create({ ownerId: "user_a", model: { id: `page-${index}`, ...input, name: `ページ${index}`, visibility } });
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const second = await repository.listPublic({ keyword: "ページ", offset: 1, limit: 1 });
    expect(second).toMatchObject({ total: 3 });
    expect(ids(second)).toEqual(["page-1"]);
    for (let index = 0; index < 4; index++) await repository.delete(`page-${index}`);
  });

  it("検索語の % と _ は文字どおりに扱う", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "user_a", model: { id: "percent", ...input, name: "100%の鶴" } });
    expect(ids(await repository.listPublic({ keyword: "100%", offset: 0, limit: 10 }))).toEqual(["percent"]);
    expect(ids(await repository.listPublic({ keyword: "%", offset: 0, limit: 10 }))).toEqual(["percent"]);
    expect(ids(await repository.listPublic({ keyword: "_", offset: 0, limit: 10 }))).toEqual([]);
    await repository.delete("percent");
  });

  it("要約の無い（0005 より前の）作品は手順から作って並べる", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "user_a", model: { id: "legacy", ...input, name: "Legacyな鶴" } });
    await db.prepare("UPDATE models SET step_count = NULL, thumbnail = NULL, search_text = NULL WHERE id = ?").bind("legacy").run();
    const listed = await repository.listPublic({ keyword: "legacy", offset: 0, limit: 10 });
    expect(listed).toMatchObject({ total: 1, items: [{ id: "legacy", stepCount: expect.any(Number), thumbnail: { faces: expect.any(Array) } }] });
    await repository.delete("legacy");
  });
});

describe("保存時の版", () => {
  it("公開範囲・データ形式・エンジンの版を記録する", async () => {
    await createD1OrigamiRepository(db).create({ ownerId: "user_a", model: { id: "versioned", ...input, visibility: "unlisted" } });
    const row = await db.prepare("SELECT visibility, format_version, engine_version FROM models WHERE id = ?").bind("versioned").first();
    expect(row).toEqual({ visibility: "unlisted", format_version: 2, engine_version: ENGINE_VERSION });
  });
});

describe("APIとD1", () => {
  it("投稿した作品をD1から読み、所有者だけが更新できる", async () => {
    const app = createApp({ repository: withMockFallback(createD1OrigamiRepository(db)), auth });
    const headers = (user: string) => ({ "Content-Type": "application/json", "x-test-user": user });
    const created = await app.request("/api/models", { method: "POST", headers: headers("user_a"), body: JSON.stringify(input) });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(await (await app.request(`/api/models/${id}`)).json()).toEqual({ id, ...input });
    expect((await app.request(`/api/models/${id}/thumbnail.png`)).headers.get("content-type")).toBe("image/png");
    expect((await app.request(`/api/models/${id}`, { method: "PUT", headers: headers("user_b"), body: JSON.stringify(input) })).status).toBe(403);
    expect((await app.request(`/api/models/${id}`, { method: "DELETE", headers: headers("user_a") })).status).toBe(204);
  });

  it("一覧はD1の作品を新しい順に並べ、そのあとにモックを並べる", async () => {
    const repository = createD1OrigamiRepository(db);
    await repository.create({ ownerId: "user_a", model: { id: "d1-old", ...input, name: "古い作品" } });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repository.create({ ownerId: "user_a", model: { id: "d1-new", ...input, name: "新しい作品" } });
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

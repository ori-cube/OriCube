import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getTableColumns } from "drizzle-orm";
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
const input = { name: "D1の鶴", description: "説明", color: "#ed7070", procedure: craneProcedure, stepDescriptions: ["半分に折る"] };

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
});

describe("APIとD1", () => {
  it("投稿した作品をD1から読み、所有者だけが更新できる", async () => {
    const app = createApp({ repository: withMockFallback(createD1OrigamiRepository(db)), auth });
    const headers = (user: string) => ({ "Content-Type": "application/json", "x-test-user": user });
    const created = await app.request("/api/models", { method: "POST", headers: headers("user_a"), body: JSON.stringify(input) });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    expect(await (await app.request(`/api/models/${id}`)).json()).toEqual({ id, ...input });
    expect((await app.request(`/api/models/${id}`, { method: "PUT", headers: headers("user_b"), body: JSON.stringify(input) })).status).toBe(403);
    expect((await app.request(`/api/models/${id}`, { method: "DELETE", headers: headers("user_a") })).status).toBe(204);
  });

  it("D1に無い鶴のモックは読めるが、変更できない", async () => {
    const app = createApp({ repository: withMockFallback(createD1OrigamiRepository(db)), auth });
    expect(await (await app.request("/api/models/crane")).json()).toMatchObject({ id: "crane", name: "鶴" });
    const res = await app.request("/api/models/crane", { method: "PUT", headers: { "Content-Type": "application/json", "x-test-user": "user_a" }, body: JSON.stringify(input) });
    expect(res.status).toBe(403);
  });
});

import { and, count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { ENGINE_VERSION } from "@oricube/engine";
import { models } from "./db/schema";
import type { OrigamiRecord, OrigamiRepository } from "./repository";
import { origamiModelSchema, type OrigamiModel } from "./schema";
import { procedureThumbnailSchema, searchTextOf, summarize, type OrigamiSummary } from "./summary";

/** Worker の D1 バインディング（drizzle-orm/d1 に渡す） */
export type D1Database = Parameters<typeof drizzle>[0];

const toRecord = (row: typeof models.$inferSelect): OrigamiRecord => ({
  ownerId: row.ownerId,
  model: {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    procedure: row.procedure,
    ...(row.stepDescriptions ? { stepDescriptions: row.stepDescriptions } : {}),
    visibility: row.visibility,
    ...(row.presentation ? { presentation: row.presentation } : {}),
  },
});

/** 一覧の要約の列。投稿・更新のときに手順から作る */
const summaryColumns = (model: OrigamiModel) => {
  const { stepCount, thumbnail } = summarize(model);
  return { stepCount, thumbnail, searchText: searchTextOf(model) };
};

/** LIKE の特殊文字（% と _）を文字どおりに扱う */
const likePattern = (keyword: string) => `%${keyword.replace(/[\\%_]/g, "\\$&")}%`;

/** 壊れた JSON は null にして、スキーマ検証で除く */
const parseJson = (value: string | null): unknown => {
  try {
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
};

const modelColumns = (model: OrigamiModel) => ({
  name: model.name,
  description: model.description,
  color: model.color,
  procedure: model.procedure,
  stepDescriptions: model.stepDescriptions ?? null,
  presentation: model.presentation ?? null,
  visibility: model.visibility,
  // 保存時のデータ形式とエンジンの版。エンジン更新で過去作品が変わらないよう記録する
  formatVersion: model.procedure.version,
  engineVersion: ENGINE_VERSION,
  ...summaryColumns(model),
});

/** Cloudflare D1 に作品を保存する */
export const createD1OrigamiRepository = (database: D1Database): OrigamiRepository => {
  const db = drizzle(database);
  return {
    findById: async (id) => {
      const row = await db.select().from(models).where(eq(models.id, id)).get();
      return row ? toRecord(row) : null;
    },
    listPublic: async ({ keyword, offset, limit }) => {
      // 要約の列が無い（0005 より前に保存した）作品は、名前と説明を小文字にしただけの値で検索する
      const searchText = sql`coalesce(${models.searchText}, lower(${models.name} || char(10) || ${models.description}))`;
      const where = and(eq(models.visibility, "public"), keyword ? sql`${searchText} LIKE ${likePattern(keyword)} ESCAPE '\\'` : undefined);
      const legacy = sql`${models.thumbnail} IS NULL OR ${models.stepCount} IS NULL`;
      const [totalRow, rows] = await Promise.all([
        db.select({ total: count() }).from(models).where(where).get(),
        db
          .select({
            id: models.id,
            name: models.name,
            description: models.description,
            color: models.color,
            stepCount: models.stepCount,
            thumbnail: models.thumbnail,
            // 要約の無い作品だけ、手順を読んで作る
            procedure: sql<string | null>`CASE WHEN ${legacy} THEN ${models.procedure} END`,
            presentation: models.presentation,
          })
          .from(models)
          .where(where)
          .orderBy(desc(models.createdAt), desc(models.id))
          .limit(limit)
          .offset(offset)
          .all(),
      ]);
      const items = rows.flatMap((row): OrigamiSummary[] => {
        const { procedure, presentation, stepCount, thumbnail, ...fields } = row;
        if (procedure === null && stepCount !== null) {
          const parsed = procedureThumbnailSchema.safeParse(thumbnail);
          if (parsed.success) return [{ ...fields, stepCount, thumbnail: parsed.data }];
          console.error(`作品 ${row.id} の一覧の要約の形式が正しくありません`, parsed.error.issues);
          return [];
        }
        const model = origamiModelSchema.safeParse({ ...fields, procedure: parseJson(procedure), ...(presentation ? { presentation } : {}) });
        if (model.success) return [summarize(model.data)];
        console.error("一覧から形式が正しくない作品を除きました", model.error.issues);
        return [];
      });
      return { items, total: totalRow?.total ?? 0 };
    },
    create: async ({ ownerId, model }) => {
      const now = new Date();
      await db.insert(models).values({
        id: model.id,
        ownerId,
        ...modelColumns(model),
        createdAt: now,
        updatedAt: now,
      });
    },
    update: async (id, model) => {
      await db.update(models).set({ ...modelColumns(model), updatedAt: new Date() }).where(eq(models.id, id));
    },
    delete: async (id) => {
      await db.delete(models).where(eq(models.id, id));
    },
  };
};

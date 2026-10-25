import { and, asc, desc, eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { ENGINE_VERSION } from "@oricube/engine";
import { models } from "./db/schema";
import type { OrigamiRecord, OrigamiRepository } from "./repository";
import type { OrigamiModel } from "./schema";

/** Worker の D1 バインディング（drizzle-orm/d1 に渡す） */
export type D1Database = Parameters<typeof drizzle>[0];

const toRecord = (row: typeof models.$inferSelect): OrigamiRecord => ({
  ownerId: row.ownerId,
  status: row.status,
  thumbnail: row.thumbnailKey && row.thumbnailContentType && row.thumbnailSize !== null
    ? { key: row.thumbnailKey, contentType: row.thumbnailContentType, size: row.thumbnailSize }
    : null,
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
});

/** Cloudflare D1 に作品を保存する */
export const createD1OrigamiRepository = (database: D1Database): OrigamiRepository => {
  const db = drizzle(database);
  return {
    findById: async (id) => {
      const row = await db.select().from(models).where(eq(models.id, id)).get();
      return row ? toRecord(row) : null;
    },
    list: async () =>
      (await db.select().from(models).where(eq(models.status, "published")).orderBy(desc(models.createdAt), desc(models.id)).all()).map(toRecord),
    listPendingBefore: async (before, limit) =>
      (await db.select().from(models).where(and(eq(models.status, "pending"), lt(models.createdAt, before))).orderBy(asc(models.createdAt)).limit(limit).all()).map(toRecord),
    listByOwner: async (ownerId) =>
      (await db.select().from(models).where(eq(models.ownerId, ownerId)).orderBy(desc(models.createdAt), desc(models.id)).all()).map(toRecord),
    create: async ({ ownerId, status, thumbnail, model }) => {
      const now = new Date();
      await db.insert(models).values({
        id: model.id,
        ownerId,
        ...modelColumns(model),
        status,
        thumbnailKey: thumbnail?.key ?? null,
        thumbnailContentType: thumbnail?.contentType ?? null,
        thumbnailSize: thumbnail?.size ?? null,
        createdAt: now,
        updatedAt: now,
      });
    },
    update: async (id, { model, status, thumbnail }) => {
      await db
        .update(models)
        .set({
          ...(model ? modelColumns(model) : {}),
          ...(status ? { status } : {}),
          ...(thumbnail !== undefined
            ? { thumbnailKey: thumbnail?.key ?? null, thumbnailContentType: thumbnail?.contentType ?? null, thumbnailSize: thumbnail?.size ?? null }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(models.id, id));
    },
    delete: async (id) => {
      await db.delete(models).where(eq(models.id, id));
    },
  };
};

import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { models } from "./db/schema";
import type { OrigamiRecord, OrigamiRepository } from "./repository";

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
  },
});

/** Cloudflare D1 に作品を保存する */
export const createD1OrigamiRepository = (database: D1Database): OrigamiRepository => {
  const db = drizzle(database);
  return {
    findById: async (id) => {
      const row = await db.select().from(models).where(eq(models.id, id)).get();
      return row ? toRecord(row) : null;
    },
    list: async () => (await db.select().from(models).orderBy(desc(models.createdAt), desc(models.id)).all()).map(toRecord),
    create: async ({ ownerId, model }) => {
      const now = new Date();
      await db.insert(models).values({
        id: model.id,
        ownerId,
        name: model.name,
        description: model.description,
        color: model.color,
        procedure: model.procedure,
        stepDescriptions: model.stepDescriptions ?? null,
        createdAt: now,
        updatedAt: now,
      });
    },
    update: async (id, model) => {
      await db
        .update(models)
        .set({
          name: model.name,
          description: model.description,
          color: model.color,
          procedure: model.procedure,
          stepDescriptions: model.stepDescriptions ?? null,
          updatedAt: new Date(),
        })
        .where(eq(models.id, id));
    },
    delete: async (id) => {
      await db.delete(models).where(eq(models.id, id));
    },
  };
};

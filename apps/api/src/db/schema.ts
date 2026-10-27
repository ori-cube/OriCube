import type { PresentationV2, ProcedureThumbnail } from "@oricube/engine";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 作品テーブル
 *
 * @description
 * migrations/ の SQL と同じ定義にする（db/schema.test.ts で照合する）。
 * procedure は ProcedureV2 を JSON 文字列で持ち、読み出し時にスキーマ検証する
 */
export const models = sqliteTable(
  "models",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    color: text("color").notNull(),
    procedure: text("procedure", { mode: "json" }).notNull(),
    stepDescriptions: text("step_descriptions", { mode: "json" }).$type<string[]>(),
    presentation: text("presentation", { mode: "json" }).$type<PresentationV2>(),
    /** 一覧の要約（投稿・更新のときに作る）。これより前の作品は NULL */
    stepCount: integer("step_count"),
    thumbnail: text("thumbnail", { mode: "json" }).$type<ProcedureThumbnail>(),
    searchText: text("search_text"),
    visibility: text("visibility", { enum: ["public", "unlisted"] }).notNull().default("public"),
    formatVersion: integer("format_version").notNull().default(2),
    engineVersion: text("engine_version").notNull().default("unknown"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("models_owner_id_idx").on(table.ownerId),
    index("models_visibility_created_at_idx").on(table.visibility, table.createdAt),
  ]
);

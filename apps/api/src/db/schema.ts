import type { PresentationV2 } from "@oricube/engine";
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
    /** pending はサムネイルの確定前で、取得・一覧に出さない */
    status: text("status", { enum: ["pending", "published"] }).notNull().default("published"),
    thumbnailKey: text("thumbnail_key"),
    thumbnailContentType: text("thumbnail_content_type", { enum: ["image/png", "image/webp"] }),
    thumbnailSize: integer("thumbnail_size"),
    presentation: text("presentation", { mode: "json" }).$type<PresentationV2>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("models_owner_id_idx").on(table.ownerId), index("models_status_created_at_idx").on(table.status, table.createdAt)]
);

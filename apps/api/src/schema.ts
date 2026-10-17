import { procedureV2Schema } from "@oricube/engine";
import { z } from "zod";

/** 作品ID。DBのUUIDと、移行中のモックのID（crane など）を受け付ける */
export const modelIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "作品IDの形式が正しくありません");

/**
 * 閲覧APIが返す作品
 *
 * @description
 * 保存済みの値もこのスキーマで検証してから返す（型共有は実行時検証の代わりにならない）
 */
export const origamiModelSchema = z.object({
  id: modelIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  procedure: procedureV2Schema,
  stepDescriptions: z.array(z.string().max(1000)).max(200).optional(),
});

export type OrigamiModel = z.infer<typeof origamiModelSchema>;

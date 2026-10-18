import { isUnitQuaternion, procedureV2Schema } from "@oricube/engine";
import { z } from "zod";

/** 作品ID。DBのUUIDと、移行中のモックのID（crane など）を受け付ける */
export const modelIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "作品IDの形式が正しくありません");

/**
 * 閲覧APIが返す作品
 *
 * @description
 * 保存済みの値もこのスキーマで検証してから返す（型共有は実行時検証の代わりにならない）
 */
export const visibilitySchema = z.enum(["public", "unlisted"]);

export const origamiModelSchema = z.object({
  id: modelIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  procedure: procedureV2Schema,
  stepDescriptions: z.array(z.string().max(1000)).max(200).optional(),
  /** 公開範囲。public は一覧・検索に載り、unlisted はURLを知っている人だけが見られる */
  visibility: visibilitySchema.default("public"),
  /** 完成形を見せる向き（engine の PresentationV2）。無ければ折ったときの向きで表示する */
  presentation: z.object({
    rotation: z.tuple([z.number(), z.number(), z.number(), z.number()]).refine(isUnitQuaternion, "回転は単位クォータニオンで指定してください"),
  }).optional(),
});

export type OrigamiModel = z.infer<typeof origamiModelSchema>;

/** 投稿・更新で受け取る作品。IDと所有者はサーバーで決める */
export const origamiInputSchema = origamiModelSchema.omit({ id: true });

/** 一覧の検索条件。page は1始まり */
export const origamiListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

/** サムネイルとして受け付ける画像。保存先のオブジェクトはこの形式とサイズで署名する */
export const THUMBNAIL_CONTENT_TYPES = ["image/png", "image/webp"] as const;
export const THUMBNAIL_MAX_BYTES = 512 * 1024;

export const thumbnailSpecSchema = z.object({
  contentType: z.enum(THUMBNAIL_CONTENT_TYPES),
  size: z.number().int().min(1).max(THUMBNAIL_MAX_BYTES),
});

export type ThumbnailSpec = z.infer<typeof thumbnailSpecSchema>;

/** 投稿で受け取る作品と、これからアップロードするサムネイルの形式 */
export const origamiCreateSchema = origamiInputSchema.extend({ thumbnail: thumbnailSpecSchema });

import { createProcedureThumbnail, createViewerTimeline, type ProcedureThumbnail } from "@oricube/engine";
import { z } from "zod";
import type { OrigamiModel } from "./schema";

/** 一覧で返す作品の要約。手順の本体は含めず、完成形の図を付ける */
export interface OrigamiSummary {
  id: string;
  name: string;
  description: string;
  color: string;
  stepCount: number;
  thumbnail: ProcedureThumbnail;
}

/** 一覧の検索条件。keyword は {@link normalizeSearchText} 済みの値 */
export interface OrigamiListQuery {
  keyword: string;
  offset: number;
  limit: number;
}

export interface OrigamiListResult {
  items: OrigamiSummary[];
  /** 条件に合う作品の総数 */
  total: number;
}

/** 検索語の比較用に、全角・半角と大文字・小文字の違いをそろえる */
export const normalizeSearchText = (value: string) => value.normalize("NFKC").toLowerCase();

/** 名前と説明から、検索の対象にする文字列を作る */
export const searchTextOf = (model: Pick<OrigamiModel, "name" | "description">) => normalizeSearchText(`${model.name}\n${model.description}`);

/**
 * 手順から一覧の要約を作る
 *
 * @description
 * 閲覧画面のタイムラインを組むため重い（作品1件で数ms）。一覧のたびに計算しないよう、保存先は投稿・更新のときに作って持つ
 */
export const summarize = (model: OrigamiModel): OrigamiSummary => {
  const timeline = createViewerTimeline(model.procedure, model.presentation);
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    color: model.color,
    stepCount: timeline.steps.length,
    thumbnail: createProcedureThumbnail(model.procedure, timeline),
  };
};

/** 保存済みの完成形の図。画面に渡す前に形を確かめる（engine の ProcedureThumbnail） */
export const procedureThumbnailSchema = z.object({
  viewBox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  faces: z.array(z.object({
    points: z.array(z.tuple([z.number(), z.number()])),
    side: z.enum(["front", "back"]),
    shade: z.number(),
  })),
});

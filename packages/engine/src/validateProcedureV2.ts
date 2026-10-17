import { z } from "zod";
import type { ProcedureV2 } from "./model-v2";

/**
 * 取り込むv2投稿データの上限
 *
 * @description
 * 鶴（15手・最終72枚）に十分な余裕を持たせつつ、巨大なデータで
 * 閲覧側の描画やAPIを止められないようにする
 */
export const PROCEDURE_V2_LIMITS = {
  maxSize: 1000,
  maxSteps: 200,
  maxBoardsPerStep: 1024,
  maxPolygonVertices: 64,
  maxAxesPerVertex: 4,
  maxFoldLinesPerStep: 64,
} as const;

const finite = z.number().finite();
const point = z.tuple([finite, finite, finite]);
const segment = z.object({ start: point, end: point });
const axis = z.object({ origin: point, direction: point }).refine(
  ({ direction }) => direction.some((value) => value !== 0),
  "回転軸の向きが0です"
);
const polygon = z.array(point).min(3).max(PROCEDURE_V2_LIMITS.maxPolygonVertices);
const layer = finite;
const fixBoard = z.object({ polygon, layer });
const moveBoard = z
  .object({
    polygon,
    layer,
    vertexAxes: z.array(z.array(axis).max(PROCEDURE_V2_LIMITS.maxAxesPerVertex)),
  })
  .refine(
    (board) => board.vertexAxes.length === board.polygon.length,
    "頂点数と回転軸の列の数が一致しません"
  );
const boards = <T extends z.ZodTypeAny>(board: T) =>
  z.array(board).max(PROCEDURE_V2_LIMITS.maxBoardsPerStep);

const step = z.object({
  kind: z.enum(["fold", "squash", "petal", "insideReverse"]),
  fixBoards: boards(fixBoard),
  moveBoards: boards(moveBoard),
  foldLines: z.array(segment).max(PROCEDURE_V2_LIMITS.maxFoldLinesPerStep),
  targetAngle: finite.gt(0).max(Math.PI).optional(),
});

const gesture = { foldLine: segment, dragVertex: point, viewFront: z.boolean() };
const historyStep = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fold"),
    ...gesture,
    foldCount: z.number().int().min(1).max(PROCEDURE_V2_LIMITS.maxBoardsPerStep),
    angle: finite.gt(0).max(Math.PI).optional(),
  }),
  z.object({ kind: z.literal("squash"), ...gesture }),
  z.object({ kind: z.literal("petal"), ...gesture }),
  z.object({ kind: z.literal("insideReverse"), ...gesture }),
]);

/**
 * v2投稿データ（ProcedureV2）の実行時スキーマ
 *
 * @description
 * - 型共有は実行時検証の代わりにならないため、APIの取り込み・DBからの読み出しで使う
 * - 頂点数と回転軸の列の対応、有限座標、紙のサイズ、手順数・板数の上限を検証する
 * - 履歴（history）は答えデータ（steps）と1対1に対応する
 */
export const procedureV2Schema = z
  .object({
    version: z.literal(2),
    size: finite.gt(0).max(PROCEDURE_V2_LIMITS.maxSize),
    steps: z.array(step).max(PROCEDURE_V2_LIMITS.maxSteps),
    finalBoards: boards(fixBoard),
    history: z.array(historyStep).max(PROCEDURE_V2_LIMITS.maxSteps),
  })
  .refine(
    (procedure) => procedure.history.length === procedure.steps.length,
    "手順と履歴の数が一致しません"
  );

/** 検証して ProcedureV2 を返す。不正な場合は null */
export const parseProcedureV2 = (value: unknown): ProcedureV2 | null => {
  const result = procedureV2Schema.safeParse(value);
  return result.success ? result.data : null;
};

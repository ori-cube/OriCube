import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

// ZodをOpenAPI対応に拡張
extendZodWithOpenApi(z);

// Point型定義
export const PointSchema = z.tuple([z.number(), z.number(), z.number()]);

// Board型定義
export const BoardSchema = z.array(PointSchema);

// RotateAxis型定義
export const RotateAxisSchema = z.union([
  z.tuple([PointSchema, PointSchema]),
  z.array(z.any()).length(0),
]);

// BaseStep型定義
export const BaseStepSchema = z.object({
  type: z.literal("Base"),
  description: z.string(),
  fixBoards: z.array(BoardSchema),
  moveBoards: z.array(BoardSchema),
  rotateAxis: RotateAxisSchema,
  initialBoards: z.array(BoardSchema),
  selectedPoints: z.array(PointSchema),
  rightBoards: z.array(BoardSchema),
  leftBoards: z.array(BoardSchema),
  isMoveBoardsRight: z.boolean(),
  numberOfMoveBoards: z.number(),
  maxNumberOfMoveBoards: z.number(),
  isFoldingDirectionFront: z.boolean(),
  foldingAngle: z.number(),
});

// ConvolutionStep型定義
export const ConvolutionStepSchema = z.object({
  type: z.literal("convolution"),
  description: z.string(),
  nodes: z.array(z.array(z.number())),
  boards: z.array(z.array(z.number())),
  moveNodesIdx: z.array(z.number()),
  rotateAxes: z.array(z.array(z.array(z.number()))),
  fixBoards: z.array(BoardSchema),
});

// Step型定義（Union型）
export const StepSchema = z.union([BaseStepSchema, ConvolutionStepSchema]);

// Procedure型定義（現在の形式に合わせて）
export const ProcedureSchema = z.record(z.string(), StepSchema);

// Model型定義
export const ModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().min(1),
  imageUrl: z.string().url(),
  searchKeyword: z.array(z.string()).default([]),
  procedure: ProcedureSchema,
});

// APIスキーマ
export const GetModelResponseSchema = ModelSchema;
export const PutModelRequestSchema = ModelSchema;

// 型定義を infer
export type Point = z.infer<typeof PointSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type RotateAxis = z.infer<typeof RotateAxisSchema>;
export type BaseStep = z.infer<typeof BaseStepSchema>;
export type ConvolutionStep = z.infer<typeof ConvolutionStepSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Procedure = z.infer<typeof ProcedureSchema>;
export type Model = z.infer<typeof ModelSchema>;

// API型定義
export type GetModelResponse = z.infer<typeof GetModelResponseSchema>;
export type PutModelRequest = z.infer<typeof PutModelRequestSchema>;

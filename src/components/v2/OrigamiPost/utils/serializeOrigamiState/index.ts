import * as THREE from "three";
import { LayeredBoard, OrigamiStep } from "../../types";

/** [x, y, z] のタプル（JSON出力用） */
export type SerializedVector = [number, number, number];

export interface SerializedFoldLine {
  start: SerializedVector;
  end: SerializedVector;
}

export type SerializedStep =
  | {
      kind: "fold";
      foldLine: SerializedFoldLine;
      dragVertex: SerializedVector;
      foldCount: number;
      viewFront: boolean;
      angle?: number;
    }
  | {
      kind: "squash" | "petal" | "insideReverse";
      foldLine: SerializedFoldLine;
      dragVertex: SerializedVector;
      viewFront: boolean;
    };

export interface SerializedBoard {
  layer: number;
  polygon: SerializedVector[];
  sourcePolygon: SerializedVector[];
}

/**
 * デバッグ・状況共有用にシリアライズした折り紙の状態
 */
export interface SerializedOrigamiState {
  /** 適用済みの折り手順 */
  steps: SerializedStep[];
  /** 現在の板群（視点側 = layer降順に並べる） */
  boards: SerializedBoard[];
}

/** 浮動小数点の桁ノイズを落とす（小数第4位まで） */
const round = (value: number): number => Math.round(value * 1e4) / 1e4;

const serializeVector = (v: THREE.Vector3): SerializedVector => [
  round(v.x),
  round(v.y),
  round(v.z),
];

const serializeStep = (step: OrigamiStep): SerializedStep => {
  const foldLine: SerializedFoldLine = {
    start: serializeVector(step.foldLine.start),
    end: serializeVector(step.foldLine.end),
  };
  const dragVertex = serializeVector(step.dragVertex);

  switch (step.kind) {
    case "fold":
      return {
        kind: "fold",
        foldLine,
        dragVertex,
        foldCount: step.foldCount,
        viewFront: step.viewFront,
        ...(step.angle !== undefined ? { angle: round(step.angle) } : {}),
      };
    case "squash":
    case "petal":
    case "insideReverse":
      return {
        kind: step.kind,
        foldLine,
        dragVertex,
        viewFront: step.viewFront,
      };
  }
};

/**
 * 現在の板群と折り手順をJSON化可能な形式に変換する
 *
 * @description
 * 折り進めた状態をコンソール経由で共有するためのデバッグ用途。
 * 座標は小数第4位に丸め、板はlayer降順（視点側が先頭）で出力する
 */
export const serializeOrigamiState = (
  boards: LayeredBoard[],
  steps: OrigamiStep[]
): SerializedOrigamiState => ({
  steps: steps.map(serializeStep),
  boards: [...boards]
    .sort((a, b) => b.layer - a.layer)
    .map((board) => ({
      layer: board.layer,
      polygon: board.polygon.map(serializeVector),
      sourcePolygon: board.sourcePolygon.map(serializeVector),
    })),
});

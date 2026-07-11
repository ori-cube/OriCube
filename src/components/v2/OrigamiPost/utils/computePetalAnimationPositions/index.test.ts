import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { computePetalAnimationPositions } from "./index";
import {
  applyPetalFoldStep,
  PetalFoldStepResult,
} from "../applyPetalFoldStep";
import { determineFoldRotation } from "../determineFoldRotation";
import { replayFoldSteps } from "../replayFoldSteps";
import { createSquareBoard } from "../createSquareBoard";
import { Board, OrigamiStep } from "../../types";

const v = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);

const CREASE_ARM = 20 * (2 - Math.SQRT2);

/** 正方基本形に花弁折りを適用した結果を作る */
const createPetalResult = (): PetalFoldStepResult => {
  const steps: OrigamiStep[] = [
    {
      kind: "fold",
      foldLine: { start: v(-20, -20), end: v(20, 20) },
      dragVertex: v(-20, 20),
      foldCount: 1,
      viewFront: true,
    },
    {
      kind: "fold",
      foldLine: { start: v(-20, 20), end: v(20, -20) },
      dragVertex: v(-20, -20),
      foldCount: 2,
      viewFront: true,
    },
    {
      kind: "squash",
      foldLine: { start: v(0, 0), end: v(20, 0) },
      dragVertex: v(20, 20),
      viewFront: true,
    },
    {
      kind: "squash",
      foldLine: { start: v(0, 0), end: v(20, 0) },
      dragVertex: v(20, 20),
      viewFront: false,
    },
  ];
  const boards = replayFoldSteps(createSquareBoard(40), steps);
  const result = applyPetalFoldStep(boards, {
    kind: "petal",
    foldLine: { start: v(CREASE_ARM, 0), end: v(0, -CREASE_ARM) },
    dragVertex: v(20, -20),
    viewFront: true,
  });
  if (!result) {
    throw new Error("前提の花弁折りが成立しませんでした");
  }
  return result;
};

/** 花弁折りの回転軸を作って途中経過の頂点座標を計算する */
const computePositions = (
  result: PetalFoldStepResult,
  angle: number
): Board[] => {
  const liftDirection = new THREE.Vector3(0, 0, 1);
  const centralPiece = result.movingPieces.find(
    (moving) => moving.motion === "mirrorFoldLine"
  );
  const firstEar = result.movingPieces.find(
    (moving) => moving.motion === "mirrorKite" && moving.sideIndex === 0
  );
  const secondEar = result.movingPieces.find(
    (moving) => moving.motion === "mirrorKite" && moving.sideIndex === 1
  );
  if (!centralPiece || !firstEar || !secondEar) {
    throw new Error("前提の動く片が見つかりませんでした");
  }

  const foldLineAxis = determineFoldRotation(
    result.foldLine,
    centralPiece.piece.polygon,
    liftDirection
  );
  const firstKiteAxis = determineFoldRotation(
    result.kiteLines[0],
    firstEar.piece.polygon,
    liftDirection
  );
  const secondKiteAxis = determineFoldRotation(
    result.kiteLines[1],
    secondEar.piece.polygon,
    liftDirection
  );
  if (!foldLineAxis || !firstKiteAxis || !secondKiteAxis) {
    throw new Error("前提の回転軸が構成できませんでした");
  }

  return computePetalAnimationPositions({
    movingPieces: result.movingPieces,
    foldLine: result.foldLine,
    kiteLines: result.kiteLines,
    tuckCreases: result.tuckCreases,
    foldLineAxis,
    kiteAxes: [firstKiteAxis, secondKiteAxis],
    angle,
  });
};

/** 2つの頂点列が一致するか判定する */
const boardsAreClose = (actual: Board, expected: Board): boolean =>
  actual.length === expected.length &&
  actual.every((vertex, index) => vertex.distanceTo(expected[index]) < 1e-6);

describe("computePetalAnimationPositions", () => {
  it("角度0では全ての片が回転前の座標のまま", () => {
    const result = createPetalResult();
    const positions = computePositions(result, 0);

    positions.forEach((piecePositions, index) => {
      expect(
        boardsAreClose(piecePositions, result.movingPieces[index].piece.polygon)
      ).toBe(true);
    });
  });

  it("角度πでは全ての片が確定後の座標に一致する", () => {
    const result = createPetalResult();
    const positions = computePositions(result, Math.PI);

    positions.forEach((piecePositions, index) => {
      expect(
        boardsAreClose(
          piecePositions,
          result.movingPieces[index].finalPiece.polygon
        )
      ).toBe(true);
    });
  });

  it("途中経過でも隣り合う片と共有する辺の頂点は同じ位置に動く", () => {
    const result = createPetalResult();
    const positions = computePositions(result, Math.PI / 2);

    const pieceAt = (
      motion: string,
      sideIndex: number
    ): { before: Board; during: Board } => {
      const index = result.movingPieces.findIndex(
        (moving) => moving.motion === motion && moving.sideIndex === sideIndex
      );
      if (index < 0) throw new Error("前提の動く片が見つかりませんでした");
      return {
        before: result.movingPieces[index].piece.polygon,
        during: positions[index],
      };
    };

    // 同一座標の頂点が同じ位置へ動くことを、回転前の座標の対応で確認する
    const movedPositionsOf = (
      piece: { before: Board; during: Board },
      point: THREE.Vector3
    ): THREE.Vector3[] =>
      piece.before.flatMap((vertex, index) =>
        vertex.distanceTo(point) < 1e-6 ? [piece.during[index]] : []
      );

    for (const sideIndex of [0, 1]) {
      const central = pieceAt("mirrorFoldLine", sideIndex);
      const side = pieceAt("kiteThenFoldLine", sideIndex);
      const ear = pieceAt("mirrorKite", sideIndex);

      // サイド片と中央片はかぶせ折り線（ドラッグ頂点V-P）を共有する
      const dragVertex = v(20, -20);
      const sideTip = movedPositionsOf(side, dragVertex);
      const centralTip = movedPositionsOf(central, dragVertex);
      expect(sideTip).toHaveLength(1);
      expect(centralTip).toHaveLength(1);
      expect(sideTip[0].distanceTo(centralTip[0])).toBeLessThan(1e-6);
      // 先端は面外（+Z側）へ持ち上がっている
      expect(sideTip[0].z).toBeGreaterThan(1);

      // サイド片と耳片は畳み込み折り目（P-corner）を共有する
      const corner = result.tuckCreases[sideIndex].end;
      const sideCorner = movedPositionsOf(side, corner);
      const earCorner = movedPositionsOf(ear, corner);
      expect(sideCorner).toHaveLength(1);
      expect(earCorner).toHaveLength(1);
      expect(sideCorner[0].distanceTo(earCorner[0])).toBeLessThan(1e-6);

      // 折り線上の交点Pは不動
      const creaseIntersection = result.kiteLines[sideIndex].end;
      const sideP = movedPositionsOf(side, creaseIntersection);
      expect(sideP).toHaveLength(1);
      expect(sideP[0].distanceTo(creaseIntersection)).toBeLessThan(1e-6);
    }
  });
});

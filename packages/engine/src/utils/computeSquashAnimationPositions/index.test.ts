import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { computeSquashAnimationPositions } from "./index";
import {
  applySquashFoldStep,
  SquashFoldStepResult,
  SquashMotion,
} from "../applySquashFoldStep";
import { determineFoldRotation } from "../determineFoldRotation";
import { replayFoldSteps } from "../replayFoldSteps";
import { createSquareBoard } from "../createSquareBoard";
import { Board, FoldStep, SquashFoldStep } from "../../types";

const v = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);

/** 一辺40の正方形を対角線で2回折り、頂点(20,20)を開いて畳むフィクスチャ */
const createSquashFixture = (): {
  step: SquashFoldStep;
  result: SquashFoldStepResult;
} => {
  const foldSteps: FoldStep[] = [
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
  ];
  const boards = replayFoldSteps(createSquareBoard(40), foldSteps);

  const step: SquashFoldStep = {
    kind: "squash",
    foldLine: { start: v(0, 0), end: v(20, 0) },
    dragVertex: v(20, 20),
    viewFront: true,
  };
  const result = applySquashFoldStep(boards, step);
  if (!result) throw new Error("前提の開いて畳むが成立しませんでした");

  return { step, result };
};

/** フィクスチャからアニメーション計算の入力を組み立てる */
const createAnimationInput = (angle: number) => {
  const { step, result } = createSquashFixture();

  const pieceOf = (motion: SquashMotion) => {
    const piece = result.movingPieces.find((moving) => moving.motion === motion);
    if (!piece) throw new Error(`${motion}の片が見つかりませんでした`);
    return piece;
  };

  const liftDirection = new THREE.Vector3(0, 0, step.viewFront ? 1 : -1);
  const foldLineAxis = determineFoldRotation(
    step.foldLine,
    pieceOf("mirrorFoldLine").piece.polygon,
    liftDirection
  );
  const hingeAxis = determineFoldRotation(
    result.hinge,
    pieceOf("mirrorHinge").piece.polygon,
    liftDirection
  );
  if (!foldLineAxis || !hingeAxis) {
    throw new Error("回転軸を決定できませんでした");
  }

  return {
    result,
    pieceOf,
    positions: computeSquashAnimationPositions({
      movingPieces: result.movingPieces,
      foldLine: step.foldLine,
      hinge: result.hinge,
      spine: { start: result.spineApex, end: step.dragVertex },
      foldLineAxis,
      hingeAxis,
      angle,
    }),
  };
};

/** 元の頂点位置に対応する回転後の頂点を取り出す */
const movedVertexOf = (
  piecePolygon: Board,
  positions: Board,
  x: number,
  y: number
): THREE.Vector3 => {
  const index = piecePolygon.findIndex(
    (vertex) => Math.abs(vertex.x - x) < 1e-6 && Math.abs(vertex.y - y) < 1e-6
  );
  if (index < 0) throw new Error(`頂点(${x}, ${y})が見つかりませんでした`);
  return positions[index];
};

const expectVectorCloseTo = (
  actual: THREE.Vector3,
  expected: THREE.Vector3
): void => {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
  expect(actual.z).toBeCloseTo(expected.z, 6);
};

describe("computeSquashAnimationPositions", () => {
  it("角度0では回転前の座標と一致する", () => {
    const { result, positions } = createAnimationInput(0);

    result.movingPieces.forEach((moving, pieceIndex) => {
      moving.piece.polygon.forEach((vertex, vertexIndex) => {
        expectVectorCloseTo(positions[pieceIndex][vertexIndex], vertex);
      });
    });
  });

  it("角度πでは確定後の座標と一致する", () => {
    const { result, positions } = createAnimationInput(Math.PI);

    result.movingPieces.forEach((moving, pieceIndex) => {
      moving.finalPiece.polygon.forEach((vertex, vertexIndex) => {
        expectVectorCloseTo(positions[pieceIndex][vertexIndex], vertex);
      });
    });
  });

  it("回転の途中でも片同士が共有する頂点は一致する（見た目上破れない）", () => {
    const { result, pieceOf, positions } = createAnimationInput(Math.PI / 2);

    const indexOf = (motion: SquashMotion) =>
      result.movingPieces.findIndex((moving) => moving.motion === motion);

    // スパインの先端（ドラッグ頂点）: 手前フラップの片と開く片で一致
    const dragVertexOnFront = movedVertexOf(
      pieceOf("mirrorFoldLine").piece.polygon,
      positions[indexOf("mirrorFoldLine")],
      20,
      20
    );
    const dragVertexOnOpen = movedVertexOf(
      pieceOf("openRotate").piece.polygon,
      positions[indexOf("openRotate")],
      20,
      20
    );
    expectVectorCloseTo(dragVertexOnFront, dragVertexOnOpen);

    // カット辺の端点(20,0): 開く片とヒンジで鏡映される片で一致
    const cutPointOnOpen = movedVertexOf(
      pieceOf("openRotate").piece.polygon,
      positions[indexOf("openRotate")],
      20,
      0
    );
    const cutPointOnHinge = movedVertexOf(
      pieceOf("mirrorHinge").piece.polygon,
      positions[indexOf("mirrorHinge")],
      20,
      0
    );
    expectVectorCloseTo(cutPointOnOpen, cutPointOnHinge);

    // スパインの端点A(0,0)は折り線とヒンジの交点なので不動
    const apexOnOpen = movedVertexOf(
      pieceOf("openRotate").piece.polygon,
      positions[indexOf("openRotate")],
      0,
      0
    );
    expectVectorCloseTo(apexOnOpen, new THREE.Vector3(0, 0, 0));

    // 表側から折っているため、動く頂点は+Z側へ持ち上がる
    expect(dragVertexOnFront.z).toBeGreaterThan(0);
    expect(cutPointOnOpen.z).toBeGreaterThan(0);
  });
});

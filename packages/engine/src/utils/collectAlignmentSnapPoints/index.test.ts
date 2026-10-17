import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { collectAlignmentSnapPoints } from "./index";
import { replayFoldSteps } from "../replayFoldSteps";
import { createSquareBoard } from "../createSquareBoard";
import { applyFoldStep } from "../applyFoldStep";
import { calculateFoldLine } from "../calculateFoldLine";
import { calculateFoldLineSpan } from "../calculateFoldLineSpan";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import { LayeredBoard, OrigamiStep } from "../../types";

const v = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);

const CREASE_ARM = 20 * (2 - Math.SQRT2);

/** 一辺100の正方形をx=0で半分に折った2枚の板を作る */
const createHalfFoldedBoards = (): LayeredBoard[] => {
  const steps: OrigamiStep[] = [
    {
      kind: "fold",
      foldLine: { start: v(0, -50), end: v(0, 50) },
      dragVertex: v(50, 50),
      foldCount: 1,
      viewFront: true,
    },
  ];
  return replayFoldSteps(createSquareBoard(100), steps);
};

/** 鶴の基本形（両面花弁折り済み・一辺40）を作る */
const createBirdBaseBoards = (): LayeredBoard[] => {
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
    {
      kind: "petal",
      foldLine: { start: v(CREASE_ARM, 0), end: v(0, -CREASE_ARM) },
      dragVertex: v(20, -20),
      viewFront: true,
    },
    {
      kind: "petal",
      foldLine: { start: v(CREASE_ARM, 0), end: v(0, -CREASE_ARM) },
      dragVertex: v(20, -20),
      viewFront: false,
    },
  ];
  const boards = replayFoldSteps(createSquareBoard(40), steps);
  if (boards.length !== 20) {
    throw new Error("前提の鶴の基本形が成立しませんでした");
  }
  return boards;
};

/** 候補一覧に期待する座標が含まれるか判定する */
const containsTarget = (
  targets: THREE.Vector3[],
  x: number,
  y: number
): boolean =>
  targets.some(
    (target) => Math.abs(target.x - x) < 1e-6 && Math.abs(target.y - y) < 1e-6
  );

describe("collectAlignmentSnapPoints", () => {
  it("辺を折り目に沿わせる畳み先が候補になる", () => {
    // 半分折り: 角(-50,-50)をドラッグすると、下辺を折り目x=0に
    // 沿わせる畳み先(0,0)が候補になる（W=(0,-50)、腕50、方向は上向き）
    const targets = collectAlignmentSnapPoints(
      createHalfFoldedBoards(),
      v(-50, -50)
    );

    expect(containsTarget(targets, 0, 0)).toBe(true);
  });

  it("ドラッグ頂点自身の位置は候補に含まれない", () => {
    const dragVertex = v(-50, -50);
    const targets = collectAlignmentSnapPoints(
      createHalfFoldedBoards(),
      dragVertex
    );

    expect(containsTarget(targets, dragVertex.x, dragVertex.y)).toBe(false);
  });

  it("同一位置の候補は1つに集約される", () => {
    const targets = collectAlignmentSnapPoints(
      createBirdBaseBoards(),
      v(CREASE_ARM, 0)
    );

    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const distance = Math.hypot(
          targets[i].x - targets[j].x,
          targets[i].y - targets[j].y
        );
        expect(distance).toBeGreaterThanOrEqual(SNAP_MERGE_TOLERANCE);
      }
    }
  });

  it("鶴の基本形で足を細くする折りの畳み先が候補になり、そのまま5枚で折れる", () => {
    const boards = createBirdBaseBoards();
    const dragVertex = v(CREASE_ARM, 0); // 横の角P
    const tip = v(20, -20); // 下の先端V

    // 期待する畳み先: スパイン上でVから|V-P|進んだ点（無理数座標）
    const armLength = dragVertex.distanceTo(tip);
    const spineDirection = v(0, 0).sub(tip).normalize();
    const expected = tip.clone().addScaledVector(spineDirection, armLength);

    const targets = collectAlignmentSnapPoints(boards, dragVertex);
    expect(containsTarget(targets, expected.x, expected.y)).toBe(true);

    // 候補へ吸着したドロップから計算した折り線で、前面5枚の折りが成立する
    const foldLineInfo = calculateFoldLine(dragVertex, expected);
    expect(foldLineInfo).not.toBeNull();
    if (!foldLineInfo) return;

    const span = calculateFoldLineSpan(
      foldLineInfo.midpoint,
      foldLineInfo.direction,
      boards.map((board) => board.polygon)
    );
    expect(span).not.toBeNull();
    if (!span) return;

    const result = applyFoldStep(boards, {
      kind: "fold",
      foldLine: span,
      dragVertex,
      foldCount: 5,
      viewFront: true,
    });
    expect(result).not.toBeNull();
  });

  it("ドラッグ頂点と辺でつながる頂点がない場合は候補なし", () => {
    const targets = collectAlignmentSnapPoints(
      createHalfFoldedBoards(),
      v(999, 999)
    );

    expect(targets).toHaveLength(0);
  });
});

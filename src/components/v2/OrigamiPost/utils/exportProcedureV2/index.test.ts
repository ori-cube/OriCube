import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { exportProcedureV2 } from "./index";
import { replayFoldSteps } from "../replayFoldSteps";
import { createSquareBoard } from "../createSquareBoard";
import { PointV2, StepV2 } from "@/types/model-v2";
import { OrigamiStep } from "../../types";

const v = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);

const CREASE_ARM = 20 * (2 - Math.SQRT2);

/** 鶴の基本形までのジェスチャ履歴（fold×2 → squash×2 → petal） */
const createCraneSteps = (): OrigamiStep[] => [
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
];

/** 保存形式の頂点をVector3へ戻す */
const fromPointV2 = (point: PointV2): THREE.Vector3 =>
  new THREE.Vector3(point[0], point[1], point[2]);

/** ステップの答えデータをθ=πで再生した後の全ポリゴンを返す */
const playStepToEnd = (step: StepV2): THREE.Vector3[][] => {
  const fixPolygons = step.fixBoards.map((board) =>
    board.polygon.map(fromPointV2)
  );
  const movedPolygons = step.moveBoards.map((board) =>
    board.polygon.map((point, vertexIndex) =>
      board.vertexAxes[vertexIndex].reduce(
        (moved, axis) =>
          moved
            .sub(fromPointV2(axis.origin))
            .applyAxisAngle(fromPointV2(axis.direction), Math.PI)
            .add(fromPointV2(axis.origin)),
        fromPointV2(point)
      )
    )
  );
  return [...fixPolygons, ...movedPolygons];
};

/** 2つのポリゴン集合が（順不同で）一致するか検証する */
const expectSamePolygons = (
  actual: THREE.Vector3[][],
  expected: THREE.Vector3[][]
): void => {
  expect(actual).toHaveLength(expected.length);

  const remaining = [...expected];
  for (const polygon of actual) {
    const matchIndex = remaining.findIndex(
      (candidate) =>
        candidate.length === polygon.length &&
        candidate.every(
          (vertex, index) => vertex.distanceTo(polygon[index]) < 1e-6
        )
    );
    expect(matchIndex).toBeGreaterThanOrEqual(0);
    remaining.splice(matchIndex, 1);
  }
};

describe("exportProcedureV2", () => {
  it("鶴の基本形までの履歴を答え形式＋履歴としてエクスポートできる", () => {
    const steps = createCraneSteps();
    const procedure = exportProcedureV2({ size: 40, steps });

    expect(procedure).not.toBeNull();
    if (!procedure) return;

    expect(procedure.version).toBe(2);
    expect(procedure.size).toBe(40);
    expect(procedure.steps.map((step) => step.kind)).toEqual([
      "fold",
      "fold",
      "squash",
      "squash",
      "petal",
    ]);
    expect(procedure.finalBoards).toHaveLength(14);
    expect(procedure.history).toHaveLength(5);
  });

  it("各ステップをθ=πまで再生すると、リプレイの次の状態と一致する", () => {
    const steps = createCraneSteps();
    const procedure = exportProcedureV2({ size: 40, steps });

    expect(procedure).not.toBeNull();
    if (!procedure) return;

    for (let index = 0; index < steps.length; index++) {
      const nextBoards = replayFoldSteps(
        createSquareBoard(40),
        steps.slice(0, index + 1)
      );
      expectSamePolygons(
        playStepToEnd(procedure.steps[index]),
        nextBoards.map((board) => board.polygon)
      );
    }
  });

  it("答えデータはソルバなしの再生に必要な構造を持つ", () => {
    const procedure = exportProcedureV2({
      size: 40,
      steps: createCraneSteps(),
    });

    expect(procedure).not.toBeNull();
    if (!procedure) return;

    // 通常の折り: 全頂点が単一の回転軸を持つ
    const foldStep = procedure.steps[0];
    expect(foldStep.moveBoards.length).toBeGreaterThan(0);
    for (const moveBoard of foldStep.moveBoards) {
      expect(moveBoard.vertexAxes).toHaveLength(moveBoard.polygon.length);
      for (const axes of moveBoard.vertexAxes) {
        expect(axes).toHaveLength(1);
      }
    }
    expect(foldStep.foldLines).toHaveLength(1);

    // 開いて畳む: 同じ板の中で頂点ごとに異なる軸の列を持つ
    // （不動の頂点と回転する頂点が混在する）。折り線+ヒンジを表示
    const squashStep = procedure.steps[2];
    expect(squashStep.moveBoards).toHaveLength(3);
    expect(
      squashStep.moveBoards.some(
        (moveBoard) =>
          moveBoard.vertexAxes.some((axes) => axes.length === 0) &&
          moveBoard.vertexAxes.some((axes) => axes.length > 0)
      )
    ).toBe(true);
    expect(squashStep.foldLines).toHaveLength(2);

    // 花弁折り: 動く片は6つ。折り線+かぶせ折り線2本を表示
    const petalStep = procedure.steps[4];
    expect(petalStep.moveBoards).toHaveLength(6);
    expect(petalStep.foldLines).toHaveLength(3);

    // 全ての板がレイヤーを持つ（閲覧側のZオフセットに使用）
    expect(
      procedure.steps.every((step) =>
        [...step.fixBoards, ...step.moveBoards].every(
          (board) => typeof board.layer === "number"
        )
      )
    ).toBe(true);
  });

  it("ジェスチャ履歴が保存形式へシリアライズされる", () => {
    const steps = createCraneSteps();
    const procedure = exportProcedureV2({ size: 40, steps });

    expect(procedure).not.toBeNull();
    if (!procedure) return;

    const foldHistory = procedure.history[0];
    expect(foldHistory.kind).toBe("fold");
    if (foldHistory.kind !== "fold") return;
    expect(foldHistory.foldCount).toBe(1);
    expect(foldHistory.dragVertex).toEqual([-20, 20, 0]);
    expect(foldHistory.foldLine.start).toEqual([-20, -20, 0]);

    const petalHistory = procedure.history[4];
    expect(petalHistory.kind).toBe("petal");
    expect(petalHistory.viewFront).toBe(true);
  });

  it("仕上げ角度の折りはtargetAngleと履歴のangleに書き出される", () => {
    const angle = (150 * Math.PI) / 180;
    const steps: OrigamiStep[] = [
      {
        kind: "fold",
        foldLine: { start: v(0, -20), end: v(0, 20) },
        dragVertex: v(-20, -20),
        foldCount: 1,
        viewFront: true,
        angle,
      },
    ];

    const procedure = exportProcedureV2({ size: 40, steps });
    expect(procedure).not.toBeNull();
    if (!procedure) return;

    expect(procedure.steps[0].targetAngle).toBeCloseTo(angle);
    const history = procedure.history[0];
    expect(history.kind).toBe("fold");
    if (history.kind !== "fold") return;
    expect(history.angle).toBeCloseTo(angle);
  });

  it("履歴が空の場合は初期状態の正方形だけを持つ", () => {
    const procedure = exportProcedureV2({ size: 40, steps: [] });

    expect(procedure).not.toBeNull();
    if (!procedure) return;

    expect(procedure.steps).toHaveLength(0);
    expect(procedure.history).toHaveLength(0);
    expect(procedure.finalBoards).toHaveLength(1);
    expect(procedure.finalBoards[0].polygon).toHaveLength(4);
  });

  it("適用できないステップを含む履歴はnullを返す", () => {
    // 折り線（無限直線 x=100）が折り紙を横切らないため折りが成立しない
    const brokenSteps: OrigamiStep[] = [
      {
        kind: "fold",
        foldLine: { start: v(100, 0), end: v(100, 20) },
        dragVertex: v(-20, 20),
        foldCount: 1,
        viewFront: true,
      },
    ];

    expect(exportProcedureV2({ size: 40, steps: brokenSteps })).toBeNull();
  });
});

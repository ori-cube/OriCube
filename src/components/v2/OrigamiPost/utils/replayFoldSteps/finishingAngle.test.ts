import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { replayFoldSteps, replayFoldStepsDetailed } from ".";
import { createSquareBoard } from "../createSquareBoard";
import { FoldStep, OrigamiStep } from "../../types";

const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);

const halfFold = (angle?: number): FoldStep => ({
  kind: "fold",
  foldLine: { start: v(0, -50), end: v(0, 50) },
  dragVertex: v(-50, -50),
  foldCount: 1,
  viewFront: true,
  ...(angle !== undefined ? { angle } : {}),
});

describe("replayFoldStepsDetailed（仕上げ角度）", () => {
  it("180度の折りは表示用回転を持たない", () => {
    const { boards, finishingRotations } = replayFoldStepsDetailed(
      createSquareBoard(100),
      [halfFold()]
    );
    expect(boards.length).toBe(2);
    expect(finishingRotations.size).toBe(0);
  });

  it("150度の折りは動いた板に表示用回転を持ち、板の位置は平面プロキシのまま", () => {
    const angle = (150 * Math.PI) / 180;
    const { boards, finishingRotations } = replayFoldStepsDetailed(
      createSquareBoard(100),
      [halfFold(angle)]
    );
    expect(boards.length).toBe(2);
    expect(finishingRotations.size).toBe(1);

    const [movedBoard, rotation] = [...finishingRotations.entries()][0];
    expect(rotation.angle).toBeCloseTo(angle);
    // 平面プロキシ: 板の座標自体は180度折りと同じ
    const flatBoards = replayFoldSteps(createSquareBoard(100), [halfFold()]);
    const flatMoved = flatBoards.find((board) => board.layer === 1);
    expect(flatMoved).toBeDefined();
    expect(movedBoard.layer).toBe(1);

    // 表側からの折りなので、(angle - π)の回転で板が+Z側へ持ち上がる
    const quaternion = new THREE.Quaternion().setFromAxisAngle(
      rotation.axis,
      rotation.angle - Math.PI
    );
    const farVertex = movedBoard.polygon
      .map((vertex) => vertex.clone().sub(rotation.origin))
      .sort((a, b) => b.length() - a.length())[0]
      .applyQuaternion(quaternion);
    expect(farVertex.z).toBeGreaterThan(0);
  });

  it("仕上げ角度の板が後続の折りの対象になると回転情報は破棄される", () => {
    const angle = (150 * Math.PI) / 180;
    const steps: OrigamiStep[] = [
      halfFold(angle),
      {
        kind: "fold",
        foldLine: { start: v(0, 0), end: v(50, 0) },
        dragVertex: v(50, 50),
        foldCount: 2,
        viewFront: true,
      },
    ];
    const { boards, finishingRotations } = replayFoldStepsDetailed(
      createSquareBoard(100),
      steps
    );
    expect(boards.length).toBe(4);
    expect(finishingRotations.size).toBe(0);
  });

  it("対象にならなかった仕上げ角度の板は回転情報を引き継ぐ", () => {
    const angle = (150 * Math.PI) / 180;
    const steps: OrigamiStep[] = [
      halfFold(angle),
      // 反対側の角(50,-50)だけを折る（仕上げ角度の板はlayer1で対象外）
      {
        kind: "fold",
        foldLine: { start: v(25, -50), end: v(25, 50) },
        dragVertex: v(50, -50),
        foldCount: 1,
        viewFront: false,
      },
    ];
    const { finishingRotations } = replayFoldStepsDetailed(
      createSquareBoard(100),
      steps
    );
    expect(finishingRotations.size).toBe(1);
  });
});

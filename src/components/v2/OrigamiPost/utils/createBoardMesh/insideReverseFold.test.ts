import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  InsideReverseFoldStep,
  LayeredBoard,
  applyInsideReverseFoldStep,
  buildInsideReverseFoldStep,
  calculateFoldLine,
  createSquareBoard,
  replayFoldSteps,
} from "@oricube/engine";
import { createBoardMesh } from "./index";
import { BOARD_BACK_COLOR } from "../../constants";

const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);

/**
 * 正方形を縦半分に折った2枚重ねのフラップ（最小の中割り対象）
 */
const foldedStrip = (): LayeredBoard[] =>
  replayFoldSteps(createSquareBoard(100), [
    {
      kind: "fold",
      foldLine: { start: v(0, -50), end: v(0, 50) },
      dragVertex: v(-50, -50),
      foldCount: 1,
      viewFront: true,
    },
  ]);

const buildStep = (
  boards: LayeredBoard[],
  dragVertex: THREE.Vector3,
  drop: THREE.Vector3,
  viewFront = true
): InsideReverseFoldStep | null => {
  const foldLineInfo = calculateFoldLine(dragVertex, drop);
  if (!foldLineInfo) return null;
  return buildInsideReverseFoldStep({
    boards,
    midpoint: foldLineInfo.midpoint,
    direction: foldLineInfo.direction,
    dragVertex,
    viewFront,
  });
};

describe("中割り折りの描画", () => {
  it.each([true, false])("表裏どちらから差し込んでも外側に見える紙の色を維持する: %s", (viewFront) => {
    const boards = foldedStrip();
    const step = buildStep(boards, v(0, 50), v(30, 20), viewFront);
    if (!step) throw new Error("中割りの手順がありません");
    const result = applyInsideReverseFoldStep(boards, step);
    if (!result) throw new Error("中割りが成立していません");
    const tips = result.boards.filter((board) => !result.staticBoards.includes(board)).sort((a, b) => b.layer - a.layer);
    const upper = createBoardMesh(tips[0].polygon, "#ed7070").children[0];
    const lastTip = tips.at(-1);
    if (!lastTip) throw new Error("先端の片がありません");
    const lower = createBoardMesh(lastTip.polygon, "#ed7070").children[1];
    if (!(upper instanceof THREE.Mesh) || !(lower instanceof THREE.Mesh) || !(upper.material instanceof THREE.MeshLambertMaterial) || !(lower.material instanceof THREE.MeshLambertMaterial)) throw new Error("紙の面がありません");
    expect(upper.material.color.getHexString()).toBe(new THREE.Color(BOARD_BACK_COLOR).getHexString());
    expect(lower.material.color.getHexString()).toBe(new THREE.Color(BOARD_BACK_COLOR).getHexString());
    expect(new Set(result.boards.map((board) => board.layer)).size).toBe(result.boards.length);
  });
});

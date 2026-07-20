import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { replayFoldSteps } from ".";
import { craneNarrowedLegsSteps } from "./craneFixture";
import { createSquareBoard } from "../createSquareBoard";
import { applyFoldStep, findFoldCandidates } from "../applyFoldStep";
import { calculateFoldLine } from "../calculateFoldLine";
import { calculateFoldLineSpan } from "../calculateFoldLineSpan";
import {
  applySquashFoldStep,
  buildSquashFoldStep,
} from "../applySquashFoldStep";
import {
  applyPetalFoldStep,
  buildPetalFoldStep,
} from "../applyPetalFoldStep";
import {
  applyInsideReverseFoldStep,
  buildInsideReverseFoldStep,
} from "../applyInsideReverseFoldStep";

describe("鶴の基本形+足細めフィクスチャのリプレイ", () => {
  const boards = replayFoldSteps(createSquareBoard(100), craneNarrowedLegsSteps);

  it("40枚の板が再現され、細くした先端には表裏16枚が重なる", () => {
    expect(boards.length).toBe(40);

    const tip = new THREE.Vector3(50, 50, 0);
    expect(findFoldCandidates(boards, tip, true).length).toBe(16);
  });

  // 首・尾を起こすには中割り折りが必要で、通常の折り・開いて畳む・花弁折りでは
  // 表現できないことを固定化する
  it("先端を起こすジェスチャは、通常の折りでは16枚まとめて表へ折る操作しか成立しない", () => {
    const tip = new THREE.Vector3(50, 50, 0);
    const drop = new THREE.Vector3(0, 40, 0);
    const foldLineInfo = calculateFoldLine(tip, drop);
    expect(foldLineInfo).not.toBeNull();
    if (!foldLineInfo) return;

    const candidates = findFoldCandidates(boards, tip, true);

    const validCounts: number[] = [];
    for (let count = 1; count <= candidates.length; count++) {
      const span = calculateFoldLineSpan(
        foldLineInfo.midpoint,
        foldLineInfo.direction,
        candidates.slice(0, count).map((candidate) => candidate.polygon)
      );
      if (!span) continue;
      const isValid =
        applyFoldStep(boards, {
          kind: "fold",
          foldLine: span,
          dragVertex: tip,
          foldCount: count,
          viewFront: true,
        }) !== null;
      if (isValid) validCounts.push(count);
    }

    // 片方の点（首）だけを起こす折りは、表裏の点が展開図上でつながって
    // いるため破れ判定で弾かれ、両方の点をまとめて表へ倒す折りしか残らない
    expect(validCounts).toEqual([16]);

    const squashStep = buildSquashFoldStep({
      boards,
      midpoint: foldLineInfo.midpoint,
      direction: foldLineInfo.direction,
      dragVertex: tip,
      viewFront: true,
    });
    const squashAvailable =
      squashStep !== null && applySquashFoldStep(boards, squashStep) !== null;
    expect(squashAvailable).toBe(false);

    const petalStep = buildPetalFoldStep({
      boards,
      midpoint: foldLineInfo.midpoint,
      direction: foldLineInfo.direction,
      dragVertex: tip,
      viewFront: true,
      acceptanceRadius: 8,
    });
    const petalAvailable =
      petalStep !== null && applyPetalFoldStep(boards, petalStep) !== null;
    expect(petalAvailable).toBe(false);

    // 中割り折りだけが「片方の点（8枚）だけを起こす」操作として成立する
    const insideReverseStep = buildInsideReverseFoldStep({
      boards,
      midpoint: foldLineInfo.midpoint,
      direction: foldLineInfo.direction,
      dragVertex: tip,
      viewFront: true,
    });
    expect(insideReverseStep).not.toBeNull();
    if (!insideReverseStep) return;
    const insideReverseResult = applyInsideReverseFoldStep(
      boards,
      insideReverseStep
    );
    expect(insideReverseResult).not.toBeNull();
    if (!insideReverseResult) return;
    expect(insideReverseResult.movingBoards.length).toBe(8);
  });
});

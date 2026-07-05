import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  EMPTY_FOLD_HISTORY,
  appliedFoldSteps,
  pushFoldStep,
  undoFoldStep,
  redoFoldStep,
  canUndo,
  canRedo,
} from "./index";
import { FoldStep } from "../../types";

const createFoldStep = (label: number): FoldStep => ({
  foldLine: {
    start: new THREE.Vector3(label, -50, 0),
    end: new THREE.Vector3(label, 50, 0),
  },
  dragVertex: new THREE.Vector3(50, 50, 0),
  foldCount: 1,
  viewFront: true,
});

describe("foldHistory", () => {
  it("空の履歴はUndoもRedoもできない", () => {
    expect(canUndo(EMPTY_FOLD_HISTORY)).toBe(false);
    expect(canRedo(EMPTY_FOLD_HISTORY)).toBe(false);
    expect(appliedFoldSteps(EMPTY_FOLD_HISTORY)).toEqual([]);
  });

  it("折り操作を積むと適用済みの手順に含まれ、Undoできるようになる", () => {
    const step = createFoldStep(0);
    const history = pushFoldStep(EMPTY_FOLD_HISTORY, step);

    expect(appliedFoldSteps(history)).toEqual([step]);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it("Undoで1手戻り、Redoでやり直せる", () => {
    const step1 = createFoldStep(1);
    const step2 = createFoldStep(2);
    const history = pushFoldStep(
      pushFoldStep(EMPTY_FOLD_HISTORY, step1),
      step2
    );

    const undone = undoFoldStep(history);
    expect(appliedFoldSteps(undone)).toEqual([step1]);
    expect(canRedo(undone)).toBe(true);

    const redone = redoFoldStep(undone);
    expect(appliedFoldSteps(redone)).toEqual([step1, step2]);
    expect(canRedo(redone)).toBe(false);
  });

  it("Undo後に新しく折ると、先の履歴は破棄される", () => {
    const step1 = createFoldStep(1);
    const step2 = createFoldStep(2);
    const step3 = createFoldStep(3);

    const history = pushFoldStep(
      pushFoldStep(EMPTY_FOLD_HISTORY, step1),
      step2
    );
    const branched = pushFoldStep(undoFoldStep(history), step3);

    expect(appliedFoldSteps(branched)).toEqual([step1, step3]);
    expect(canRedo(branched)).toBe(false);
  });

  it("先頭でのUndo・末尾でのRedoは何もしない", () => {
    const step = createFoldStep(0);
    const history = pushFoldStep(EMPTY_FOLD_HISTORY, step);

    expect(undoFoldStep(undoFoldStep(history))).toEqual({
      steps: [step],
      index: 0,
    });
    expect(redoFoldStep(history)).toBe(history);
  });
});

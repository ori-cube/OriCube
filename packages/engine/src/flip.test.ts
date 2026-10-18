import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { EditorStep, FoldStep } from "./types";
import { createViewerTimeline } from "./playback";
import { exportProcedureV2 } from "./utils/exportProcedureV2";
import { replayFoldSteps } from "./utils/replayFoldSteps";
import { createSquareBoard } from "./utils/createSquareBoard";
import { parseProcedureV2 } from "./validateProcedureV2";

const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);
/** 正方形を対角線で半分に折る */
const fold = (viewFront = true): FoldStep => ({ kind: "fold", foldLine: { start: v(-50, -50), end: v(50, 50) }, dragVertex: v(-50, 50), foldCount: 1, viewFront });
const flip = (viewFront: boolean): EditorStep => ({ kind: "flip", viewFront });

const timeline = (steps: EditorStep[]) => {
  const procedure = exportProcedureV2({ size: 100, steps });
  if (!procedure) throw new Error("書き出せません");
  return { procedure, kinds: createViewerTimeline(procedure).steps.map((step) => step.kind) };
};

describe("裏返しの保存と再生（version 3）", () => {
  it("最後の折りの後の裏返しも手順として再生する", () => {
    const { procedure, kinds } = timeline([fold(), flip(false)]);
    expect(procedure.version).toBe(3);
    expect(procedure.history.map((step) => step.kind)).toEqual(["fold", "flip"]);
    expect(kinds).toEqual(["fold", "flip"]);
    expect(createViewerTimeline(procedure).finalViewFront).toBe(false);
  });

  it("折りと折りの間で往復した裏返しも再生する", () => {
    const { kinds } = timeline([flip(false), flip(true), fold()]);
    expect(kinds).toEqual(["flip", "flip", "fold"]);
  });

  it("カメラを回して裏から折った場合は、その折りの前に裏返しを補う", () => {
    const { procedure, kinds } = timeline([fold(false)]);
    expect(procedure.history).toEqual([{ kind: "flip", viewFront: false }, expect.objectContaining({ kind: "fold", viewFront: false })]);
    expect(kinds).toEqual(["flip", "fold"]);
  });

  it("表裏を変えない裏返しは残さない", () => {
    expect(timeline([flip(true), fold()]).procedure.history.map((step) => step.kind)).toEqual(["fold"]);
  });

  it("裏返しは板の形状を変えない", () => {
    const withFlips = replayFoldSteps(createSquareBoard(100), [flip(false), fold(false), flip(true)]);
    const withoutFlips = replayFoldSteps(createSquareBoard(100), [fold(false)]);
    expect(withFlips.map((board) => board.polygon)).toEqual(withoutFlips.map((board) => board.polygon));
  });

  it("書き出したデータは検証を通り、表裏が食い違う履歴は受け付けない", () => {
    const { procedure } = timeline([fold(), flip(false), flip(true), flip(false)]);
    const json = JSON.parse(JSON.stringify(procedure));
    expect(parseProcedureV2(json)).toEqual(json);
    // 裏返しを抜くと、裏から折った記録と表裏が食い違う
    const inconsistent = timeline([flip(false), fold(false)]).procedure;
    expect(parseProcedureV2({ ...inconsistent, history: inconsistent.history.filter((step) => step.kind !== "flip") })).toBeNull();
    expect(parseProcedureV2({ ...json, version: 2 })).toBeNull();
  });
});

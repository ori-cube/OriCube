import { describe, expect, it } from "vitest";
import type { ProcedureV2 } from "./model-v2";
import { exportProcedureV2 } from "./utils/exportProcedureV2";
import { craneNarrowedLegsSteps } from "./utils/replayFoldSteps/craneFixture";
import { PROCEDURE_V2_LIMITS, parseProcedureV2 } from "./validateProcedureV2";

const crane = (): ProcedureV2 => {
  const procedure = exportProcedureV2({ size: 100, steps: craneNarrowedLegsSteps });
  if (!procedure) throw new Error("鶴の手順を書き出せません");
  // JSONを経由した値（APIの入力・DBの値）として扱う
  return JSON.parse(JSON.stringify(procedure)) as ProcedureV2;
};

describe("parseProcedureV2", () => {
  it("エクスポートした鶴の手順と白紙を受け付ける", () => {
    const procedure = crane();
    expect(parseProcedureV2(procedure)).toEqual(procedure);
    const blank = { ...procedure, steps: [], history: [] };
    expect(parseProcedureV2(blank)).toEqual(blank);
  });

  it.each([
    ["v1など別の形式", (p: ProcedureV2) => ({ ...p, version: 1 })],
    ["紙のサイズが0", (p: ProcedureV2) => ({ ...p, size: 0 })],
    ["紙のサイズが上限を超える", (p: ProcedureV2) => ({ ...p, size: PROCEDURE_V2_LIMITS.maxSize + 1 })],
    ["座標が有限でない", (p: ProcedureV2) => ({ ...p, finalBoards: [{ ...p.finalBoards[0], polygon: [[Number.NaN, 0, 0], ...p.finalBoards[0].polygon.slice(1)] }] })],
    ["座標が3次元でない", (p: ProcedureV2) => ({ ...p, finalBoards: [{ ...p.finalBoards[0], polygon: p.finalBoards[0].polygon.map(([x, y]) => [x, y]) }] })],
    ["頂点数と回転軸の列の数が違う", (p: ProcedureV2) => ({ ...p, steps: [{ ...p.steps[0], moveBoards: [{ ...p.steps[0].moveBoards[0], vertexAxes: p.steps[0].moveBoards[0].vertexAxes.slice(1) }] }, ...p.steps.slice(1)] })],
    ["回転軸の向きが0", (p: ProcedureV2) => ({ ...p, steps: [{ ...p.steps[0], moveBoards: [{ ...p.steps[0].moveBoards[0], vertexAxes: p.steps[0].moveBoards[0].vertexAxes.map(() => [{ origin: [0, 0, 0], direction: [0, 0, 0] }]) }] }, ...p.steps.slice(1)] })],
    ["仕上げ角度が180度を超える", (p: ProcedureV2) => ({ ...p, steps: [{ ...p.steps[0], targetAngle: Math.PI * 1.5 }, ...p.steps.slice(1)] })],
    ["手順と履歴の数が違う", (p: ProcedureV2) => ({ ...p, history: p.history.slice(1) })],
    ["手順数が上限を超える", (p: ProcedureV2) => {
      const count = PROCEDURE_V2_LIMITS.maxSteps + 1;
      return { ...p, steps: Array.from({ length: count }, () => p.steps[0]), history: Array.from({ length: count }, () => p.history[0]) };
    }],
  ])("%sは受け付けない", (_, mutate) => {
    expect(parseProcedureV2(mutate(crane()))).toBeNull();
  });
});

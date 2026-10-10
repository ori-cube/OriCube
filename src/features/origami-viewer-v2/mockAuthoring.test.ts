import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { exportProcedureV2 } from "@/components/v2/OrigamiPost/utils/exportProcedureV2";
import type { OrigamiStep } from "@/components/v2/OrigamiPost/types";
import { mockModule, parseMockDraft, restoreHistory, serializeMockDraft, type MockDraft } from "./mockAuthoring";

export const recordedStep: OrigamiStep = { kind: "fold", foldLine: { start: new THREE.Vector3(-50, -50, 0), end: new THREE.Vector3(50, 50, 0) }, dragVertex: new THREE.Vector3(-50, 50, 0), foldCount: 1, viewFront: true, angle: Math.PI / 2 };
const procedure = exportProcedureV2({ size: 100, steps: [recordedStep] });
if (!procedure) throw new Error("有効な折り手順が必要です");
const draft: MockDraft = { model: { id: "crane", name: "手で折った鶴", description: "", color: "#ed7070", procedure }, viewFront: false };

describe("UIで作るV2モック", () => {
  it("保存したJSONから色・手順・仕上げ角度・裏側の視点を復元できる", () => {
    const restored = parseMockDraft(serializeMockDraft(draft));
    expect(restored).toEqual(draft);
    expect(restoreHistory(restored.model.procedure.history)).toEqual([recordedStep]);
    expect(restored.model.procedure.steps[0].targetAngle).toBe(Math.PI / 2);
  });
  it("V2の履歴から再計算し、手順がないJSONも白紙として再開できる", () => {
    const corruptedAnswers = { ...draft.model, procedure: { ...procedure, finalBoards: [] } };
    expect(parseMockDraft(JSON.stringify(corruptedAnswers)).model.procedure).toEqual(procedure);
    const blank = exportProcedureV2({ size: 100, steps: [] });
    expect(parseMockDraft(JSON.stringify({ ...draft.model, procedure: blank })).model.procedure.history).toHaveLength(0);
  });
  it("モック用TSがモデル型を満たす静的データを含む", () => {
    const source = mockModule(draft.model);
    expect(source).toContain("export const recordedCraneModel =");
    expect(source).toContain("satisfies OrigamiModelV2");
    expect(source).toContain(JSON.stringify(draft.model, null, 2));
  });
  it("V1・不正な座標・枚数・角度・再現できない履歴を取り込まない", () => {
    expect(() => parseMockDraft(JSON.stringify({ ...draft.model, procedure: { ...procedure, version: 1 } }))).toThrow("V2");
    const invalidSteps = [
      { ...procedure.history[0], dragVertex: [0, 0] },
      { ...procedure.history[0], foldCount: 0 },
      { ...procedure.history[0], angle: 4 },
      { ...procedure.history[0], dragVertex: [1000, 1000, 0] },
    ];
    for (const history of invalidSteps) expect(() => parseMockDraft(JSON.stringify({ ...draft.model, procedure: { ...procedure, history: [history] } }))).toThrow();
  });
});

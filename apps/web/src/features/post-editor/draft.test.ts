import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { OrigamiStep } from "@oricube/engine";
import { exportProcedureV2 } from "@oricube/engine";
import { parseDraft, restoreHistory, serializeDraft, type Draft } from "./draft";

export const recordedStep: OrigamiStep = { kind: "fold", foldLine: { start: new THREE.Vector3(-50, -50, 0), end: new THREE.Vector3(50, 50, 0) }, dragVertex: new THREE.Vector3(-50, 50, 0), foldCount: 1, viewFront: true, angle: Math.PI / 2 };
const procedure = exportProcedureV2({ size: 100, steps: [recordedStep] });
if (!procedure) throw new Error("有効な折り手順が必要です");
const draft: Draft = { model: { id: "draft", name: "手で折った鶴", description: "", color: "#ed7070", procedure }, viewFront: false };

describe("投稿画面の下書き", () => {
  it("保存した下書きから色・手順・仕上げ角度・裏側の視点を復元できる", () => {
    const restored = parseDraft(serializeDraft(draft));
    expect(restored).toEqual(draft);
    expect(restoreHistory(restored.model.procedure.history)).toEqual([recordedStep]);
    expect(restored.model.procedure.steps[0].targetAngle).toBe(Math.PI / 2);
  });
  it("完成形を見せる向きを復元し、壊れた向きは手順を残して捨てる", () => {
    const presentation = { rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2] as [number, number, number, number] };
    expect(parseDraft(serializeDraft({ ...draft, model: { ...draft.model, presentation } })).model.presentation).toEqual(presentation);
    const broken = parseDraft(JSON.stringify({ ...draft.model, presentation: { rotation: [0, 0, 0, 3] } }));
    expect(broken.model).not.toHaveProperty("presentation");
    expect(broken.model.procedure).toEqual(procedure);
  });
  it("V2の履歴から再計算し、手順がない下書きも白紙として再開できる", () => {
    const corruptedAnswers = { ...draft.model, procedure: { ...procedure, finalBoards: [] } };
    expect(parseDraft(JSON.stringify(corruptedAnswers)).model.procedure).toEqual(procedure);
    const blank = exportProcedureV2({ size: 100, steps: [] });
    expect(parseDraft(JSON.stringify({ ...draft.model, procedure: blank })).model.procedure.history).toHaveLength(0);
  });
  it("V1・不正な座標・枚数・角度・再現できない履歴を取り込まない", () => {
    expect(() => parseDraft(JSON.stringify({ ...draft.model, procedure: { ...procedure, version: 1 } }))).toThrow("V2");
    const invalidSteps = [
      { ...procedure.history[0], dragVertex: [0, 0] },
      { ...procedure.history[0], foldCount: 0 },
      { ...procedure.history[0], angle: 4 },
      { ...procedure.history[0], dragVertex: [1000, 1000, 0] },
    ];
    for (const history of invalidSteps) expect(() => parseDraft(JSON.stringify({ ...draft.model, procedure: { ...procedure, history: [history] } }))).toThrow();
  });
});

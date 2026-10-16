import * as THREE from "three";
import type { PointV2 } from "@/types/model-v2";
import type { OrigamiStep } from "@/components/v2/OrigamiPost/types";
import { exportProcedureV2 } from "@/components/v2/OrigamiPost/utils/exportProcedureV2";
import type { OrigamiModelV2 } from "./model";

export const MOCK_DRAFT_KEY = "oricube.v2.crane-draft";
export interface MockDraft { model: OrigamiModelV2; viewFront: boolean }

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const point = (value: unknown): value is PointV2 => Array.isArray(value) && value.length === 3 && value.every((axis) => typeof axis === "number" && Number.isFinite(axis));

export const restoreHistory = (value: unknown): OrigamiStep[] => {
  if (!Array.isArray(value) || value.length > 200) throw new Error("折り手順の形式が正しくありません。");
  return value.map((step: unknown): OrigamiStep => {
    if (!record(step) || !record(step.foldLine) || !point(step.foldLine.start) || !point(step.foldLine.end) || !point(step.dragVertex) || typeof step.viewFront !== "boolean") throw new Error("折り手順の座標・表裏の情報が正しくありません。");
    const base = { foldLine: { start: new THREE.Vector3(...step.foldLine.start), end: new THREE.Vector3(...step.foldLine.end) }, dragVertex: new THREE.Vector3(...step.dragVertex), viewFront: step.viewFront };
    if (base.foldLine.start.distanceToSquared(base.foldLine.end) < 1e-12) throw new Error("折り線の長さがありません。");
    switch (step.kind) {
      case "fold": {
        if (typeof step.foldCount !== "number" || !Number.isInteger(step.foldCount) || step.foldCount < 1) throw new Error("折る枚数が正しくありません。");
        if (step.angle !== undefined && (typeof step.angle !== "number" || !Number.isFinite(step.angle) || step.angle <= 0 || step.angle > Math.PI)) throw new Error("折り角度が正しくありません。");
        return { ...base, kind: "fold", foldCount: step.foldCount, ...(typeof step.angle === "number" ? { angle: step.angle } : {}) };
      }
      case "squash": case "petal": case "insideReverse": return { ...base, kind: step.kind };
      default: throw new Error("対応していない折り方です。");
    }
  });
};

export const parseMockDraft = (text: string): MockDraft => {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error("JSONの形式が正しくありません。"); }
  if (!record(value) || !record(value.procedure) || value.procedure.version !== 2) throw new Error("V2の折り紙JSONを選んでください。");
  const size = value.procedure.size;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0 || size > 1000) throw new Error("紙のサイズが正しくありません。");
  if (typeof value.name !== "string" || !value.name.trim() || typeof value.color !== "string" || !/^#[0-9a-f]{6}$/i.test(value.color)) throw new Error("作品名・色が正しくありません。");
  const steps = restoreHistory(value.procedure.history);
  const procedure = exportProcedureV2({ size, steps });
  if (!procedure) throw new Error("この手順を再現できません。現在の下書きは変更していません。");
  return {
    model: { id: "crane", name: value.name, description: typeof value.description === "string" ? value.description : "", color: value.color, procedure },
    viewFront: typeof value.editorViewFront === "boolean" ? value.editorViewFront : steps.at(-1)?.viewFront ?? true,
  };
};

export const serializeMockDraft = ({ model, viewFront }: MockDraft) => JSON.stringify({ ...model, editorViewFront: viewFront }, null, 2);

export const mockModule = (model: OrigamiModelV2) => `import type { OrigamiModelV2 } from "../model";

export const recordedCraneModel = ${JSON.stringify(model, null, 2)} satisfies OrigamiModelV2;
`;

export const saveMockFile = (filename: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  // ブラウザがダウンロードを開始してからBlobを解放する。
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

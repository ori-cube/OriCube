import * as THREE from "three";
import type { PointV2, EditorStep } from "@oricube/engine";
import { exportProcedureV2, isUnitQuaternion } from "@oricube/engine";
import type { OrigamiModelV2 } from "@oricube/engine";

// 以前の下書きを引き継ぐため、キーは変えない
export const DRAFT_KEY = "oricube.v2.crane-draft";
/** ブラウザに自動保存する折りかけの作品。viewFront は編集を再開するときの表裏 */
export interface Draft { model: OrigamiModelV2; viewFront: boolean }

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const point = (value: unknown): value is PointV2 => Array.isArray(value) && value.length === 3 && value.every((axis) => typeof axis === "number" && Number.isFinite(axis));

/** 保存した履歴（折りと裏返し）を投稿画面の履歴に戻す */
export const restoreHistory = (value: unknown): EditorStep[] => {
  // 裏返しも履歴に入るため、折りの上限（200）の2倍まで受け付ける
  if (!Array.isArray(value) || value.length > 400) throw new Error("折り手順の形式が正しくありません。");
  return value.map((step: unknown): EditorStep => {
    if (record(step) && step.kind === "flip") {
      if (typeof step.viewFront !== "boolean") throw new Error("裏返しの表裏の情報が正しくありません。");
      return { kind: "flip", viewFront: step.viewFront };
    }
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

export const parseDraft = (text: string): Draft => {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error("下書きの形式が正しくありません。"); }
  if (!record(value) || !record(value.procedure) || (value.procedure.version !== 2 && value.procedure.version !== 3)) throw new Error("V2の下書きではありません。");
  const size = value.procedure.size;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0 || size > 1000) throw new Error("紙のサイズが正しくありません。");
  if (typeof value.name !== "string" || !value.name.trim() || typeof value.color !== "string" || !/^#[0-9a-f]{6}$/i.test(value.color)) throw new Error("作品名・色が正しくありません。");
  const steps = restoreHistory(value.procedure.history);
  const procedure = exportProcedureV2({ size, steps });
  if (!procedure) throw new Error("この手順を再現できません。現在の下書きは変更していません。");
  return {
    model: {
      id: "draft", name: value.name, description: typeof value.description === "string" ? value.description : "", color: value.color, procedure,
      // 見せる向きが壊れていても手順は復元し、向きだけ捨てる
      ...(record(value.presentation) && isUnitQuaternion(value.presentation.rotation) ? { presentation: { rotation: value.presentation.rotation } } : {}),
    },
    viewFront: typeof value.editorViewFront === "boolean" ? value.editorViewFront : steps.at(-1)?.viewFront ?? true,
  };
};

export const serializeDraft = ({ model, viewFront }: Draft) => JSON.stringify({ ...model, editorViewFront: viewFront }, null, 2);

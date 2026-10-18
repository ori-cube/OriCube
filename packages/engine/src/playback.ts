import * as THREE from "three";
import type { FixBoardV2, MoveBoardV2, PointV2, PresentationV2, ProcedureV2, QuaternionV2, StepV2 } from "./model-v2";

export type ViewerStep =
  | { kind: "fold"; data: StepV2; fixedBoards: FixBoardV2[]; settledBoards: FixBoardV2[]; settledFlatBoards: FixBoardV2[]; sourceIndex: number; viewFront: boolean; label: string }
  | { kind: "flip"; boards: FixBoardV2[]; flatBoards: FixBoardV2[]; viewFront: boolean; label: string }
  /** 折り終えた形を、完成形を見せる向き（PresentationV2）へ回す */
  | { kind: "present"; boards: FixBoardV2[]; flatBoards: FixBoardV2[]; viewFront: boolean; rotation: QuaternionV2; label: string };

const IDENTITY: QuaternionV2 = [0, 0, 0, 1];

const labels: Record<StepV2["kind"], string> = {
  fold: "折る", squash: "開いて畳む", petal: "花弁折り", insideReverse: "中割り折り",
};

export const rotateMovingBoard = (board: MoveBoardV2, angle: number): PointV2[] =>
  board.polygon.map((point, index) => {
    const vertex = new THREE.Vector3(...point);
    for (const axis of board.vertexAxes[index]) {
      const origin = new THREE.Vector3(...axis.origin);
      vertex.sub(origin).applyAxisAngle(new THREE.Vector3(...axis.direction).normalize(), angle).add(origin);
    }
    return [vertex.x, vertex.y, vertex.z];
  });

type BoardPose = { flat: FixBoardV2; displayed: PointV2[] };
const samePolygon = (left: PointV2[], right: PointV2[]) =>
  left.length === right.length && left.every((point, index) => point.every((value, axis) => Math.abs(value - right[index][axis]) < 1e-6));

/**
 * 閲覧ステップを作る
 *
 * @description
 * 表裏が変わる折りの前に裏返しを入れる。presentation があれば、最後に完成形の向きへ回すステップを足す
 * （折る途中は折ったときの向きのまま見せる）。finalRotation は完成形を表示するときの回転
 */
export const createViewerTimeline = (procedure: ProcedureV2, presentation?: PresentationV2) => {
  const steps: ViewerStep[] = [];
  let viewFront = true;
  let poses: BoardPose[] = [];
  const posedBoard = (board: FixBoardV2): FixBoardV2 => ({
    layer: board.layer, polygon: poses.find((pose) => pose.flat.layer === board.layer && samePolygon(pose.flat.polygon, board.polygon))?.displayed ?? board.polygon,
  });

  procedure.steps.forEach((data, sourceIndex) => {
    const nextFront = procedure.history[sourceIndex]?.viewFront ?? viewFront;
    const fixedBoards = data.fixBoards.map(posedBoard);
    if (nextFront !== viewFront) {
      steps.push({ kind: "flip", flatBoards: [...data.fixBoards, ...data.moveBoards], boards: [...fixedBoards, ...data.moveBoards.map(posedBoard)], viewFront, label: nextFront ? "裏返して表側を向ける" : "裏返して裏側を向ける" });
    }
    viewFront = nextFront;
    const movedPoses = data.moveBoards.map((board) => ({
      flat: rotateMovingBoard(board, Math.PI), displayed: rotateMovingBoard(board, data.targetAngle ?? Math.PI),
    }));
    const next = procedure.steps[sourceIndex + 1];
    const flatBoards = next ? [...next.fixBoards, ...next.moveBoards] : procedure.finalBoards;
    // 同じ平面座標に重なる表裏の羽を、固定板のレイヤーで区別して引き継ぐ。
    const settledBoards = flatBoards.map((board): FixBoardV2 => {
      const fixedIndex = data.fixBoards.findIndex((fixed) => fixed.layer === board.layer && samePolygon(fixed.polygon, board.polygon));
      const polygon = fixedIndex >= 0 ? fixedBoards[fixedIndex].polygon
        : movedPoses.find((pose) => samePolygon(pose.flat, board.polygon))?.displayed ?? board.polygon;
      return { layer: board.layer, polygon };
    });
    poses = flatBoards.map((flat, index) => ({ flat, displayed: settledBoards[index].polygon }));
    steps.push({ kind: "fold", data, fixedBoards, settledBoards, settledFlatBoards: flatBoards, sourceIndex, viewFront, label: labels[data.kind] });
  });
  const finalBoards = procedure.finalBoards.map(posedBoard);
  const finalRotation = presentation?.rotation ?? IDENTITY;
  if (presentation && steps.length) {
    steps.push({ kind: "present", boards: finalBoards, flatBoards: procedure.finalBoards, viewFront, rotation: finalRotation, label: "完成形の向きに整える" });
  }
  return { steps, finalBoards, finalViewFront: viewFront, finalRotation };
};

export const getStepBoards = (step: ViewerStep, progress: number): FixBoardV2[] => {
  if (step.kind !== "fold") return step.boards;
  if (progress >= 1) return step.settledBoards;
  const angle = Math.max(0, Math.min(progress, 1)) * (step.data.targetAngle ?? Math.PI);
  return [...step.fixedBoards, ...step.data.moveBoards.map((board) => ({ polygon: rotateMovingBoard(board, angle), layer: board.layer }))];
};

export const getViewAngle = (step: ViewerStep, progress: number) =>
  (step.viewFront ? 0 : Math.PI) + (step.kind === "flip" ? Math.PI * Math.max(0, Math.min(progress, 1)) : 0);

export const getFlatStepBoards = (step: ViewerStep, settled: boolean): FixBoardV2[] =>
  step.kind !== "fold" ? step.flatBoards : settled ? step.settledFlatBoards : [...step.data.fixBoards, ...step.data.moveBoards];

/** 表示に掛ける回転。完成形の向きに整えるステップでは、回転なしから見せる向きへ補間する */
export const getPresentationRotation = (step: ViewerStep, progress: number): QuaternionV2 => {
  if (step.kind !== "present") return IDENTITY;
  const rotation = new THREE.Quaternion().slerp(new THREE.Quaternion(...step.rotation), Math.max(0, Math.min(progress, 1)));
  return [rotation.x, rotation.y, rotation.z, rotation.w];
};

import * as THREE from "three";
import type { FixBoardV2, MoveBoardV2, PointV2, ProcedureV2, StepV2 } from "./model-v2";

export type ViewerStep =
  | { kind: "fold"; data: StepV2; fixedBoards: FixBoardV2[]; settledBoards: FixBoardV2[]; settledFlatBoards: FixBoardV2[]; sourceIndex: number; viewFront: boolean; label: string }
  | { kind: "flip"; boards: FixBoardV2[]; flatBoards: FixBoardV2[]; viewFront: boolean; label: string };

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

export const createViewerTimeline = (procedure: ProcedureV2) => {
  const steps: ViewerStep[] = [];
  let viewFront = true;
  let poses: BoardPose[] = [];
  const posedBoard = (board: FixBoardV2): FixBoardV2 => ({
    layer: board.layer, polygon: poses.find((pose) => pose.flat.layer === board.layer && samePolygon(pose.flat.polygon, board.polygon))?.displayed ?? board.polygon,
  });

  /** 次の折りの直前（折りが残っていなければ完成形）の平らな板。裏返しはこの形のまま回す */
  const flatBoardsBefore = (foldIndex: number): FixBoardV2[] => {
    const next = procedure.steps[foldIndex];
    return next ? [...next.fixBoards, ...next.moveBoards] : procedure.finalBoards;
  };
  const pushFlip = (nextFront: boolean, foldIndex: number) => {
    const flatBoards = flatBoardsBefore(foldIndex);
    steps.push({ kind: "flip", flatBoards, boards: flatBoards.map(posedBoard), viewFront, label: nextFront ? "裏返して表側を向ける" : "裏返して裏側を向ける" });
    viewFront = nextFront;
  };

  const pushFold = (data: StepV2, sourceIndex: number) => {
    const fixedBoards = data.fixBoards.map(posedBoard);
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
  };

  if (procedure.version >= 3) {
    // 保存した裏返しをそのまま再生する（折りの間の往復や最後の折りの後の裏返しも含む）
    let foldIndex = 0;
    for (const entry of procedure.history) {
      if (entry.kind === "flip") {
        if (entry.viewFront !== viewFront) pushFlip(entry.viewFront, foldIndex);
        continue;
      }
      const data = procedure.steps[foldIndex];
      if (!data) break;
      pushFold(data, foldIndex);
      foldIndex += 1;
    }
  } else {
    // version 2 は裏返しを保存していないため、折りの表裏の変化から推定する
    procedure.steps.forEach((data, sourceIndex) => {
      const nextFront = procedure.history[sourceIndex]?.viewFront ?? viewFront;
      if (nextFront !== viewFront) pushFlip(nextFront, sourceIndex);
      pushFold(data, sourceIndex);
    });
  }
  return { steps, finalBoards: procedure.finalBoards.map(posedBoard), finalViewFront: viewFront };
};

export const getStepBoards = (step: ViewerStep, progress: number): FixBoardV2[] => {
  if (step.kind === "flip") return step.boards;
  if (progress >= 1) return step.settledBoards;
  const angle = Math.max(0, Math.min(progress, 1)) * (step.data.targetAngle ?? Math.PI);
  return [...step.fixedBoards, ...step.data.moveBoards.map((board) => ({ polygon: rotateMovingBoard(board, angle), layer: board.layer }))];
};

export const getViewAngle = (step: ViewerStep, progress: number) =>
  (step.viewFront ? 0 : Math.PI) + (step.kind === "flip" ? Math.PI * Math.max(0, Math.min(progress, 1)) : 0);

export const getFlatStepBoards = (step: ViewerStep, settled: boolean): FixBoardV2[] =>
  step.kind === "flip" ? step.flatBoards : settled ? step.settledFlatBoards : [...step.data.fixBoards, ...step.data.moveBoards];

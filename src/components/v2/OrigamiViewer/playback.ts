import * as THREE from "three";
import type { FixBoardV2, MoveBoardV2, PointV2, ProcedureV2, StepV2 } from "@/types/model-v2";

export type ViewerStep =
  | { kind: "fold"; data: StepV2; fixedBoards: FixBoardV2[]; sourceIndex: number; viewFront: boolean; label: string }
  | { kind: "flip"; boards: FixBoardV2[]; viewFront: boolean; label: string };

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

type BoardPose = { flat: PointV2[]; displayed: PointV2[] };
const samePolygon = (left: PointV2[], right: PointV2[]) =>
  left.length === right.length && left.every((point, index) => point.every((value, axis) => Math.abs(value - right[index][axis]) < 1e-6));

export const createViewerTimeline = (procedure: ProcedureV2) => {
  const steps: ViewerStep[] = [];
  let viewFront = true;
  let poses: BoardPose[] = [];
  const posedBoard = (board: FixBoardV2): FixBoardV2 => ({
    ...board, polygon: poses.find((pose) => samePolygon(pose.flat, board.polygon))?.displayed ?? board.polygon,
  });

  procedure.steps.forEach((data, sourceIndex) => {
    const nextFront = procedure.history[sourceIndex]?.viewFront ?? viewFront;
    const fixedBoards = data.fixBoards.map(posedBoard);
    if (nextFront !== viewFront) {
      steps.push({ kind: "flip", boards: [...fixedBoards, ...data.moveBoards.map(posedBoard)], viewFront, label: nextFront ? "裏返して表側を向ける" : "裏返して裏側を向ける" });
    }
    viewFront = nextFront;
    steps.push({ kind: "fold", data, fixedBoards, sourceIndex, viewFront, label: labels[data.kind] });
    // finalBoardsは平面プロキシなので、仕上げ角度の表示座標を別に引き継ぐ。
    poses = [
      ...data.fixBoards.map((board, index) => ({ flat: board.polygon, displayed: fixedBoards[index].polygon })),
      ...data.moveBoards.map((board) => ({ flat: rotateMovingBoard(board, Math.PI), displayed: rotateMovingBoard(board, data.targetAngle ?? Math.PI) })),
    ];
  });
  return { steps, finalBoards: procedure.finalBoards.map(posedBoard), finalViewFront: viewFront };
};

export const getStepBoards = (step: ViewerStep, progress: number): FixBoardV2[] => {
  if (step.kind === "flip") return step.boards;
  const angle = Math.max(0, Math.min(progress, 1)) * (step.data.targetAngle ?? Math.PI);
  return [...step.fixedBoards, ...step.data.moveBoards.map((board) => ({ polygon: rotateMovingBoard(board, angle), layer: board.layer }))];
};

export const getViewAngle = (step: ViewerStep, progress: number) =>
  (step.viewFront ? 0 : Math.PI) + (step.kind === "flip" ? Math.PI * Math.max(0, Math.min(progress, 1)) : 0);

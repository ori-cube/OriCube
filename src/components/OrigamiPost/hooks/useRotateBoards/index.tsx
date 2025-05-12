import { Board, RotateAxis } from "@/types/model";
import { useEffect, useMemo } from "react";
import { renderBoard } from "../../logics/renderBoard";
import { rotateBoards } from "../../logics/rotateBoards";
import * as THREE from "three";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtomValue } from "jotai";

type UseRotateBoards = (props: {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  origamiColor: string;
}) => void;

export const useRotateBoards: UseRotateBoards = ({
  sceneRef,
  origamiColor,
}) => {
  const currentStep = useAtomValue(currentStepAtom);
  const inputStep = currentStep.inputStep;
  const procedureIndex = currentStep.procedureIndex;
  const inputStepObject = useAtomValue(inputStepObjectAtom);
  const step = inputStepObject[procedureIndex.toString()];
  // if (step.type !== "Base") return;

  // const fixBoards = step.fixBoards;
  // const moveBoards = step.moveBoards;
  // const rotateAxis = step.rotateAxis;
  // const foldingAngle = step.foldingAngle;
  // const numberOfMoveBoards = step.numberOfMoveBoards;
  // const isFoldingDirectionFront = step.isFoldingDirectionFront;
  // const isMoveBoardsRight = step.isMoveBoardsRight;

  const fixBoards = useMemo(
    () => (step.type === "Base" ? step.fixBoards : []),
    [step]
  );
  const moveBoards = useMemo(
    () => (step.type === "Base" ? step.moveBoards : []),
    [step]
  );
  const rotateAxis: RotateAxis = useMemo(
    () => (step.type === "Base" ? step.rotateAxis : []),
    [step]
  );
  const numberOfMoveBoards = useMemo(
    () => (step.type === "Base" ? step.numberOfMoveBoards : 0),
    [step]
  );
  const isFoldingDirectionFront = useMemo(
    () => (step.type === "Base" ? step.isFoldingDirectionFront : false),
    [step]
  );
  const isMoveBoardsRight = useMemo(
    () => (step.type === "Base" ? step.isMoveBoardsRight : false),
    [step]
  );
  const foldingAngle = useMemo(
    () => (step.type === "Base" ? step.foldingAngle : 0),
    [step]
  );

  useEffect(() => {
    const scene = sceneRef.current;
    if (step.type !== "Base") return;
    if (!scene) return;
    if (inputStep !== "fold") return;
    if (rotateAxis.length === 0) return;

    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    let xyPlaneBoards: Board[] = [];
    const notXyPlaneBoards: Board[] = [];
    for (let i = 0; i < moveBoards.length; i++) {
      const board = moveBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        xyPlaneBoards.push(board);
      } else {
        notXyPlaneBoards.push(board);
      }
    }

    // xy平面上の板をz座標が大きい順にソート
    xyPlaneBoards = xyPlaneBoards.sort((a, b) => b[0][2] - a[0][2]);

    const foldBoards = [
      ...xyPlaneBoards.slice(0, numberOfMoveBoards),
      ...notXyPlaneBoards,
    ];
    const notFoldBoards = xyPlaneBoards.slice(numberOfMoveBoards);

    const rotatedBoards = rotateBoards({
      boards: foldBoards,
      rotateAxis,
      angle: foldingAngle,
      isFoldingDirectionFront: isFoldingDirectionFront,
      isMoveBoardsRight,
    });
    const boards = [...fixBoards, ...rotatedBoards, ...notFoldBoards];

    // 前の板を削除
    scene.children = scene.children.filter((child) => {
      return child.name === "Axis";
    });
    // 板を描画
    boards.forEach((board) => {
      renderBoard({ scene, board, color: origamiColor });
    });
  }, [
    foldingAngle,
    fixBoards,
    moveBoards,
    rotateAxis,
    numberOfMoveBoards,
    origamiColor,
    sceneRef,
    inputStep,
    isFoldingDirectionFront,
    isMoveBoardsRight,
    step.type,
  ]);
};

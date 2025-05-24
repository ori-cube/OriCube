import { Board } from "@/types/model";
import { useEffect } from "react";
import { renderBoard } from "../../logics/renderBoard";
import { rotateBoards } from "../../logics/rotateBoards";
import * as THREE from "three";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtomValue } from "jotai";

type UseRotateBoards = (props: {
  foldBoards: Board[];
  notFoldBoards: Board[];
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  origamiColor: string;
}) => void;

export const useRotateBoards: UseRotateBoards = ({
  foldBoards,
  notFoldBoards,
  sceneRef,
  origamiColor,
}) => {
  const currentStep = useAtomValue(currentStepAtom);
  const inputStep = currentStep.inputStep;
  const procedureIndex = currentStep.procedureIndex;
  const inputStepObject = useAtomValue(inputStepObjectAtom);
  const step = inputStepObject[procedureIndex.toString()];

  const rotateAxis = step.rotateAxis;
  const foldingAngle = step.foldingAngle;
  const numberOfMoveBoards = step.numberOfMoveBoards;
  const isFoldingDirectionFront = step.isFoldingDirectionFront;
  const isMoveBoardsRight = step.isMoveBoardsRight;

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (inputStep !== "fold") return;
    if (rotateAxis.length === 0) return;

    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    let xyPlaneBoards: Board[] = [];
    const notXyPlaneBoards: Board[] = [];
    for (let i = 0; i < foldBoards.length; i++) {
      const board = foldBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        xyPlaneBoards.push(board);
      } else {
        notXyPlaneBoards.push(board);
      }
    }

    // xy平面上の板をz座標が大きい順にソート
    xyPlaneBoards = xyPlaneBoards.sort((a, b) => b[0][2] - a[0][2]);

    const rotateTargetBoards = [
      ...xyPlaneBoards.slice(0, numberOfMoveBoards),
      ...notXyPlaneBoards,
    ];
    const notRotateTargetBoards = xyPlaneBoards.slice(numberOfMoveBoards);

    const rotatedBoards = rotateBoards({
      boards: rotateTargetBoards,
      rotateAxis,
      angle: foldingAngle,
      isFoldingDirectionFront: isFoldingDirectionFront,
      isMoveBoardsRight,
    });
    const boards = [
      ...notFoldBoards,
      ...rotatedBoards,
      ...notRotateTargetBoards,
    ];

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
    foldBoards,
    notFoldBoards,
    rotateAxis,
    numberOfMoveBoards,
    origamiColor,
    sceneRef,
    inputStep,
    isFoldingDirectionFront,
    isMoveBoardsRight,
  ]);
};

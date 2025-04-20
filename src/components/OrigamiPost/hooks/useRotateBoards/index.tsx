import { Board } from "@/types/model";
import { useEffect } from "react";
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
  const fixBoards = inputStepObject[procedureIndex.toString()].fixBoards;
  const moveBoards = inputStepObject[procedureIndex.toString()].moveBoards;
  const rotateAxis = inputStepObject[procedureIndex.toString()].rotateAxis;
  const foldingAngle = inputStepObject[procedureIndex.toString()].foldingAngle;
  const numberOfMoveBoards =
    inputStepObject[procedureIndex.toString()].numberOfMoveBoards;
  const isFoldingDirectionFront =
    inputStepObject[procedureIndex.toString()].isFoldingDirectionFront;
  const isMoveBoardsRight =
    inputStepObject[procedureIndex.toString()].isMoveBoardsRight;

  useEffect(() => {
    const scene = sceneRef.current;
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
  ]);
};

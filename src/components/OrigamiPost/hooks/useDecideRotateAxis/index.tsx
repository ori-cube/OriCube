/* 
回転軸を決定し、板を左右に分割するカスタムフック
**/

import { Point, Board } from "@/types/model";
import { getAllIntersections } from "../../logics/getAllIntersections";
import { separateBoard } from "../../logics/separateBoard";
import { isOnLeftSide } from "../../logics/isOnLeftSide";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom } from "jotai";

type UseDecideRotateAxis = () => {
  handleDecideRotateAxis: () => void;
  handleCancelRotateAxis: () => void;
};

export const useDecideRotateAxis: UseDecideRotateAxis = () => {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

  const procedureIndex = currentStep.procedureIndex;
  const selectedPoints =
    inputStepObject[procedureIndex.toString()].selectedPoints;
  const fixBoards = inputStepObject[procedureIndex.toString()].fixBoards;

  // 選択された点のバリデーション
  const validateSelectedPoints = (selectedPoints: Point[]) => {
    if (selectedPoints.length < 2) {
      throw new Error("点が2つ選択されていません");
    }
  };
  //板の左右判定のバリデーション
  const validateBoardSide = (board: Board, axis: [Point, Point]) => {
    const isLeftSide = board.map((point) =>
      isOnLeftSide({
        point,
        axis1: axis[0],
        axis2: axis[1],
      })
    );

    const isAllLeft = isLeftSide.every((b) => b);
    const isAllRight = isLeftSide.every((b) => !b);

    if (!isAllLeft && !isAllRight) {
      throw new Error("板が回転軸の左右にまたがっているため、分割できません。");
    }
  };
  //板を分割するか、左右どちらに属するかを判定
  const processBoards = (fixBoards: Board[], axis: [Point, Point]) => {
    const lefts: Board[] = [];
    const rights: Board[] = [];

    for (const board of fixBoards) {
      const intersections = getAllIntersections({
        board,
        rotateAxis: axis,
      });

      if (intersections.length === 2) {
        // 板を分割する場合
        const separatedBoard = separateBoard({
          board,
          rotateAxis: axis,
        });
        if (!separatedBoard) {
          throw new Error("板の分割に失敗しました。");
        }
        const { leftBoard, rightBoard } = separatedBoard;
        lefts.push(leftBoard);
        rights.push(rightBoard);
      } else {
        // 板を分割しない場合
        validateBoardSide(board, axis); // 左右判定のバリデーション

        const isLeftSide = board.map((point) =>
          isOnLeftSide({
            point,
            axis1: axis[0],
            axis2: axis[1],
          })
        );

        const isAllLeft = isLeftSide.every((b) => b);
        const isAllRight = isLeftSide.every((b) => !b);

        if (isAllLeft) {
          lefts.push(board);
        }
        if (isAllRight) {
          rights.push(board);
        }
      }
    }

    return { lefts, rights };
  };

  const handleDecideRotateAxis = async () => {
    try {
      validateSelectedPoints(selectedPoints);

      const axis: [Point, Point] = [
        [...selectedPoints[0]],
        [...selectedPoints[1]],
      ];

      const { lefts, rights } = processBoards(fixBoards, axis);

      // 状態を更新
      setInputStepObject({
        ...inputStepObject,
        [procedureIndex.toString()]: {
          ...inputStepObject[procedureIndex.toString()],
          rotateAxis: axis,
          leftBoards: lefts,
          rightBoards: rights,
        },
      });

      setCurrentStep({
        ...currentStep,
        inputStep: "target",
      });
    } catch (error) {
      throw error;
    }
  };

  const handleCancelRotateAxis = () => {
    setCurrentStep({
      ...currentStep,
      inputStep: "axis",
    });
  };

  return {
    handleDecideRotateAxis,
    handleCancelRotateAxis,
  };
};

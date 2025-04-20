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

  const handleDecideRotateAxis = () => {
    if (selectedPoints.length < 2)
      return console.error("点が2つ選択されていません");

    const axis: [Point, Point] = [
      [...selectedPoints[0]],
      [...selectedPoints[1]],
    ];

    const lefts: Board[] = [];
    const rights: Board[] = [];

    for (let i = 0; i < fixBoards.length; i++) {
      const board = fixBoards[i];
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
        if (!separatedBoard) return alert("Failed to separate board.");
        const { leftBoard, rightBoard } = separatedBoard;
        lefts.push(leftBoard);
        rights.push(rightBoard);
      } else {
        // 板を分割しない場合
        // 板が回転軸の左側にあるか、右側にあるかを判定
        // TODO: 一部分だけ回転軸の左右にある場合はエラーになる。

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
        } else if (isAllRight) {
          rights.push(board);
        } else {
          //   return setPopup({
          //     message: "板が回転軸の左右にまたがっているため、分割できません。",
          //     type: "error",
          //   });
        }
      }
    }

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

/* 
回転軸を決定し、板を左右に分割するカスタムフック
**/

import { Point, Board } from "@/types/three";
import { getAllIntersections } from "../../logics/getAllIntersections";
import { separateBoard } from "../../logics/separateBoard";
import { useState } from "react";
import { isOnLeftSide } from "../../logics/isOnLeftSide";
import { Step } from "../../FoldMethodControlPanel";

type UseDecideRotateAxis = (props: {
  selectedPoints: Point[];
  fixBoards: Board[];
  setInputStep: React.Dispatch<React.SetStateAction<Step>>;
  origamiColor: string;
}) => {
  handleDecideRotateAxis: () => void;
  handleCancelRotateAxis: () => void;
  leftBoards: Board[];
  rightBoards: Board[];
  rotateAxis: [Point, Point] | [];
};

export const useDecideRotateAxis: UseDecideRotateAxis = ({
  selectedPoints,
  fixBoards,
  setInputStep,
}) => {
  const [leftBoards, setLeftBoards] = useState<Board[]>([]);
  const [rightBoards, setRightBoards] = useState<Board[]>([]);
  const [rotateAxis, setRotateAxis] = useState<[Point, Point] | []>([]);

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

    setRotateAxis(axis);
    setLeftBoards(lefts);
    setRightBoards(rights);

    setInputStep("target");
  };

  const handleCancelRotateAxis = () => {
    setInputStep("axis");
  };

  return {
    handleDecideRotateAxis,
    handleCancelRotateAxis,
    leftBoards,
    rightBoards,
    rotateAxis,
  };
};

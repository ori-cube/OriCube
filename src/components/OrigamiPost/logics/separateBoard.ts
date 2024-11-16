/* 
板を回転軸で左右に分割する関数。
**/

import { isBoardFrontSide } from "./isBoardFrontSide";
import { sortBoardCoordinate } from "./sortBoardCoordinate";
import { getAllIntersections } from "./getAllIntersections";
import { isOnLeftSide } from "./isOnLeftSide";
import { Board, RotateAxis } from "@/types/three";

type Props = {
  board: Board;
  rotateAxis: RotateAxis;
};

type SeparateBoard = (props: Props) => { leftBoard: Board; rightBoard: Board };

export const separateBoard: SeparateBoard = ({ board, rotateAxis }) => {
  const leftBoard: Board = [];
  const rightBoard: Board = [];

  // boardの各辺とrotateAxisの交点を求める
  const allIntersections = getAllIntersections({ board, rotateAxis });

  if (allIntersections.length !== 2) {
    return { leftBoard: [], rightBoard: [] };
  }

  // 板を左右(leftBoard, rightBoard)に分ける
  for (let i = 0; i < board.length; i++) {
    const p = board[i];
    const isLeft = isOnLeftSide({
      point: p,
      axis1: rotateAxis[0],
      axis2: rotateAxis[1],
    });
    console.log("isLeft", isLeft);
    if (isLeft) {
      leftBoard.push(p);
    } else {
      rightBoard.push(p);
    }
  }

  // leftBoardとrightBoardにintersectionを重複を避けて追加
  allIntersections.forEach((p) => {
    const isDuplicated = leftBoard.some(
      (f) => f[0] === p[0] && f[1] === p[1] && f[2] === p[2]
    );
    if (!isDuplicated) leftBoard.push(p);

    const isDuplicated2 = rightBoard.some(
      (m) => m[0] === p[0] && m[1] === p[1] && m[2] === p[2]
    );
    if (!isDuplicated2) rightBoard.push(p);
  });

  const isFrontSide = isBoardFrontSide({ board });

  // 座標をソート
  const sortedLeftBoard = sortBoardCoordinate({
    board: leftBoard,
    isFrontSide: isFrontSide,
  });
  const sortedRightBoard = sortBoardCoordinate({
    board: rightBoard,
    isFrontSide: isFrontSide,
  });

  return {
    leftBoard: sortedLeftBoard,
    rightBoard: sortedRightBoard,
  };
};

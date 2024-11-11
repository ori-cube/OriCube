/* 
板を回転軸で左右に分割する関数。
**/

import { sortBoardCoordinate } from "./sortBoardCoordinate";
import { getAllIntersections } from "./getAllIntersections";

type Point = [number, number, number];
type Board = Point[];

type RotateAxis = [Point, Point];

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

  // 座標をソート
  const sortedLeftBoard = sortBoardCoordinate({
    board: leftBoard,
    isFrontSide: true,
  });
  const sortedRightBoard = sortBoardCoordinate({
    board: rightBoard,
    isFrontSide: true,
  });

  return {
    leftBoard: sortedLeftBoard,
    rightBoard: sortedRightBoard,
  };
};

type IsOnLeftSide = (props: {
  point: Point;
  axis1: Point;
  axis2: Point;
}) => boolean;

const isOnLeftSide: IsOnLeftSide = ({ point, axis1, axis2 }) => {
  // 2つのベクトルの外積が正ならば左側にある
  const v1 = [axis2[0] - axis1[0], axis2[1] - axis1[1], axis2[2] - axis1[2]];
  const v2 = [point[0] - axis1[0], point[1] - axis1[1], point[2] - axis1[2]];
  const crossProduct = [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0],
  ];
  return crossProduct[2] > 0;
};

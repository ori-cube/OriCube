/**
 * 複数の目的を持つクソ関数
 *
 * useDecideFoldMethodでは、
 *  moveBoardsとnumberOfMoveBoardsから、どの板を何枚折るかを決める関数として機能
 * useRegisterOrigamiでは、
 *  procedureを作成する関数として機能
 *
 * 座標のフォーマットも担っている
 *
 * foldBoards, notFoldBoardsの命名もわかりづらいし、
 * moveBoardsの中にそもそも折らない板が混在している場合があるのは気持ち悪い
 */

import { Board, Point } from "@/types/model";
import { Procedure } from "@/types/model";

type DecideNewProcedure = (props: {
  fixBoards: Board[];
  moveBoards: Board[];
  numberOfMoveBoards: number;
  rotateAxis: [Point, Point];
  isFoldingDirectionFront: boolean;
  isMoveBoardsRight: boolean;
  description: string;
}) => {
  foldBoards: Board[];
  notFoldBoards: Board[];
  newProcedure: Procedure[number];
};

export const decideNewProcedure: DecideNewProcedure = ({
  fixBoards,
  moveBoards,
  numberOfMoveBoards,
  rotateAxis,
  isFoldingDirectionFront,
  isMoveBoardsRight,
  description,
}) => {
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

  // rotateAxisをソートする。
  let sortedRotateAxis = rotateAxis;
  if (isMoveBoardsRight) {
    sortedRotateAxis =
      rotateAxis[0][0] < rotateAxis[1][0]
        ? rotateAxis
        : [rotateAxis[1], rotateAxis[0]];
  } else {
    sortedRotateAxis =
      rotateAxis[0][0] > rotateAxis[1][0]
        ? rotateAxis
        : [rotateAxis[1], rotateAxis[0]];
  }

  let z = 0;
  //  回転軸の2つのz座標の差の絶対値が0.01以下の場合、z座標を一番大きい板のz座標に合わせる
  if (Math.abs(sortedRotateAxis[0][2] - sortedRotateAxis[1][2]) < 0.01) {
    for (let i = 0; i < foldBoards.length; i++) {
      const board = foldBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        if (isFoldingDirectionFront) {
          if (z === undefined || board[0][2] > z) {
            z = board[0][2];
          }
        } else {
          if (z === undefined || board[0][2] < z) {
            z = board[0][2];
          }
        }
      }
    }
  }

  // sortedRotateAxisのz座標にzを加える
  sortedRotateAxis = sortedRotateAxis.map((point) => {
    return [point[0], point[1], point[2] + z];
  }) as [Point, Point];

  console.log("sortedRotateAxis");

  // isFoldingDirectionFrontがfalseなら、sortedRotateAxisの順序を逆にする
  if (isFoldingDirectionFront === false) {
    sortedRotateAxis = [sortedRotateAxis[1], sortedRotateAxis[0]];
  }

  /**
   * selectedPoints, rightBoards, leftBoards, initialBoardsは、atomから取得しないといけない
   * buildを通すために一旦ここでは空にしておく
   */
  const newProcedure: Procedure[number] = {
    type: "Base",
    description: description,
    fixBoards: [...fixBoards, ...notFoldBoards],
    moveBoards: foldBoards,
    rotateAxis: sortedRotateAxis,
    initialBoards: [],
    selectedPoints: [],
    rightBoards: [],
    leftBoards: [],
    isMoveBoardsRight: isMoveBoardsRight,
    numberOfMoveBoards: numberOfMoveBoards,
    maxNumberOfMoveBoards: numberOfMoveBoards,
    isFoldingDirectionFront: isFoldingDirectionFront,
    foldingAngle: 180,
  };

  return { foldBoards, notFoldBoards, newProcedure };
};

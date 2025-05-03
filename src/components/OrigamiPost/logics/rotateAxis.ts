import { Point, Board } from "@/types/model";
import { getAllIntersections } from "./getAllIntersections";
import { isOnLeftSide } from "./isOnLeftSide";
import { separateBoard } from "./separateBoard";

//板を分割するか、左右どちらに属するかを判定
export const processBoards = (fixBoards: Board[], axis: [Point, Point]) => {
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
      validateIsSeparatable(separatedBoard); // 板の分割のバリデーション

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

// 選択された点のエラーハンドリング
// TODO: 後で別ファイルに移動
export const validateSelectedPoints = (selectedPoints: Point[]) => {
  if (selectedPoints.length < 2) {
    throw new Error("点を２つ えらんでください。");
  }
};

//板の左右判定のエラーハンドリング
// TODO: 後で別ファイルに移動
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

//板を分割する場合のエラーハンドリング
// TODO: 後で別ファイルに移動
const validateIsSeparatable = (
  separateBoard: { leftBoard: Board; rightBoard: Board } | null
) => {
  if (!separateBoard) {
    throw new Error("板の分割に失敗しました。");
  }
};

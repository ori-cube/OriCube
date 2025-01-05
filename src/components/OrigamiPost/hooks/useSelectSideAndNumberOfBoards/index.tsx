import { Board } from "@/types/model";
import { useState } from "react";

type UseSelectSideAndNumberOfBoards = (props: {
  isMoveBoardsRight: boolean;
  rightBoards: Board[];
  leftBoards: Board[];
  setFixBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  setMoveBoards: React.Dispatch<React.SetStateAction<Board[]>>;
}) => {
  handleFoldFrontSide: () => void;
  handleFoldBackSide: () => void;
  numberOfMoveBoards: number;
  maxNumberOfMoveBoards: number;
  isFoldingDirectionFront: boolean;
};

export const useSelectSideAndNumberOfBoards: UseSelectSideAndNumberOfBoards = ({
  isMoveBoardsRight,
  rightBoards,
  leftBoards,
  setFixBoards,
  setMoveBoards,
}) => {
  const [numberOfMoveBoards, setNumberOfMoveBoards] = useState(0);
  const [isFoldingDirectionFront, setIsFoldingDirectionFront] = useState(true);
  // 手前に折るか、奥に折るかを決める関数
  // 手前に折る場合、moveBoardsのz座標に+0.001し、奥に折る場合はz座標に-0.001する
  // また、1回押すごとにnumberOfMoveBoardsに1を足す
  const tmpBoards = isMoveBoardsRight ? rightBoards : leftBoards;
  const maxNumberOfMoveBoards = tmpBoards.filter((board) =>
    board.every((point) => point[2] === board[0][2])
  ).length;

  const handleFoldFrontSide = () => {
    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    let xyPlaneBoards: Board[] = [];
    const notXyPlaneBoards: Board[] = [];

    const targetBoards = isMoveBoardsRight ? rightBoards : leftBoards;
    const maxNumberOfMoveBoards = targetBoards.filter((board) =>
      board.every((point) => point[2] === board[0][2])
    ).length;
    const number = !isFoldingDirectionFront
      ? 1
      : (numberOfMoveBoards + 1) % (maxNumberOfMoveBoards + 1);
    for (let i = 0; i < targetBoards.length; i++) {
      const board = targetBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        xyPlaneBoards.push(board);
      } else {
        notXyPlaneBoards.push(board);
      }
    }

    // xy平面上の板をz座標が大きい順にソート
    xyPlaneBoards = xyPlaneBoards.sort((a, b) => b[0][2] - a[0][2]);

    // foldXyPlaneBoardsの、上からumber枚にz座標を+0.001する
    const foldXyPlaneBoards = xyPlaneBoards
      .slice(0, number)
      .map(
        (board) =>
          board.map((point) => [point[0], point[1], point[2] + 0.001]) as Board
      );

    const foldBoards = [...foldXyPlaneBoards, ...notXyPlaneBoards];
    const notFoldBoards = xyPlaneBoards.slice(number);

    setMoveBoards(foldBoards);
    setFixBoards([
      ...(isMoveBoardsRight ? leftBoards : rightBoards),
      ...notFoldBoards,
    ]);
    setNumberOfMoveBoards(number);
    setIsFoldingDirectionFront(true);
  };

  const handleFoldBackSide = () => {
    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    let xyPlaneBoards: Board[] = [];
    const notXyPlaneBoards: Board[] = [];

    const targetBoards = isMoveBoardsRight ? rightBoards : leftBoards;
    const maxNumberOfMoveBoards = targetBoards.filter((board) =>
      board.every((point) => point[2] === board[0][2])
    ).length;
    const number = isFoldingDirectionFront
      ? 1
      : (numberOfMoveBoards + 1) % (maxNumberOfMoveBoards + 1);
    for (let i = 0; i < targetBoards.length; i++) {
      const board = targetBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        xyPlaneBoards.push(board);
      } else {
        notXyPlaneBoards.push(board);
      }
    }

    // xy平面上の板をz座標が小さい順にソート
    xyPlaneBoards = xyPlaneBoards.sort((a, b) => a[0][2] - b[0][2]);

    // foldXyPlaneBoardsの、下からnumber枚にz座標を-0.001する
    const foldXyPlaneBoards = xyPlaneBoards
      .slice(0, number)
      .map(
        (board) =>
          board.map((point) => [point[0], point[1], point[2] - 0.001]) as Board
      );

    const foldBoards = [...foldXyPlaneBoards, ...notXyPlaneBoards];
    const notFoldBoards = xyPlaneBoards.slice(number);

    setMoveBoards(foldBoards);
    setFixBoards([
      ...(isMoveBoardsRight ? leftBoards : rightBoards),
      ...notFoldBoards,
    ]);
    setNumberOfMoveBoards(number);
    setIsFoldingDirectionFront(false);
  };

  return {
    handleFoldFrontSide,
    handleFoldBackSide,
    numberOfMoveBoards,
    maxNumberOfMoveBoards,
    isFoldingDirectionFront,
  };
};

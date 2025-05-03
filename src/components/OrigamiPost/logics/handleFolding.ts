import { Board } from "@/types/model";

// 折る枚数を計算
export const calculateSelectedBoardCount = (
  isFoldingDirectionFront: boolean,
  numberOfMoveBoards: number,
  maxNumberOfMoveBoards: number
): number => {
  const selectedBoardCount = isFoldingDirectionFront
    ? 1
    : (numberOfMoveBoards + 1) % (maxNumberOfMoveBoards + 1);

  validateFold(selectedBoardCount, maxNumberOfMoveBoards);

  return selectedBoardCount;
};

// 板を分類し、折る板と折らない板を処理
export const processBoardsForFolding = (
  boards: Board[],
  selectedBoardCount: number,
  zOffset: number
): { foldBoards: Board[]; notFoldBoards: Board[] } => {
  const { xyPlaneBoards, notXyPlaneBoards } = classifyBoards(boards);

  // xy平面上の板を z 座標でソート
  xyPlaneBoards.sort((a, b) =>
    zOffset > 0 ? b[0][2] - a[0][2] : a[0][2] - b[0][2]
  );

  // z座標をずらして折る板を生成
  const foldXyPlaneBoards = adjustZCoordinates(
    xyPlaneBoards,
    selectedBoardCount,
    zOffset
  );

  const foldBoards = [...foldXyPlaneBoards, ...notXyPlaneBoards];
  const notFoldBoards = xyPlaneBoards.slice(selectedBoardCount);

  return { foldBoards, notFoldBoards };
};

// エラーチェック
// TODO: 後で別のファイルに移動する
const validateFold = (
  selectedBoardCount: number,
  maxNumberOfMoveBoards: number
) => {
  if (selectedBoardCount < 0 || selectedBoardCount > maxNumberOfMoveBoards) {
    throw new Error("折る枚数が不正です");
  }
};

// 板を分類する
const classifyBoards = (boards: Board[]) => {
  // xy平面上の板のうち、z座標が大きい順に折る
  // それ以外の板は無条件で折る
  const xyPlaneBoards: Board[] = [];
  const notXyPlaneBoards: Board[] = [];

  for (const board of boards) {
    const isEquallyZ = board.every((point) => point[2] === board[0][2]);
    if (isEquallyZ) {
      xyPlaneBoards.push(board);
    } else {
      notXyPlaneBoards.push(board);
    }
  }

  return { xyPlaneBoards, notXyPlaneBoards };
};

// z座標を調整する
const adjustZCoordinates = (
  boards: Board[],
  selectedBoardCount: number,
  zOffset: number
): Board[] => {
  return boards
    .slice(0, selectedBoardCount)
    .map(
      (board) =>
        board.map((point) => [point[0], point[1], point[2] + zOffset]) as Board
    );
};

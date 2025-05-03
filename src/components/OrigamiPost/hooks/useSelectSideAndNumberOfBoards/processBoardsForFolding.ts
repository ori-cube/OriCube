import { Board } from "@/types/model";

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

export const calculateSelectedBoardCount = (
  // 折る枚数を計算

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

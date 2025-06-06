import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom, useAtomValue } from "jotai";
import { calculateSelectedBoardCount } from "./calculateSelectedBoardCount";
import { processBoardsForFolding } from "./processBoardsForFolding";
import { Board } from "@/types/model";

type UseSelectSideAndNumberOfBoards = (props: {
  setFoldBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  setNotFoldBoards: React.Dispatch<React.SetStateAction<Board[]>>;
}) => {
  handleFoldFrontSide: () => void;
  handleFoldBackSide: () => void;
};

export const useSelectSideAndNumberOfBoards: UseSelectSideAndNumberOfBoards = ({
  setFoldBoards,
  setNotFoldBoards,
}) => {
  const currentStep = useAtomValue(currentStepAtom);
  const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

  const procedureIndex = currentStep.procedureIndex;
  const step = inputStepObject[procedureIndex.toString()];

  const isMoveBoardsRight = step.isMoveBoardsRight;
  const leftBoards = step.leftBoards;
  const rightBoards = step.rightBoards;
  const isFoldingDirectionFront = step.isFoldingDirectionFront;
  const numberOfMoveBoards = step.numberOfMoveBoards;

  const targetBoards = isMoveBoardsRight ? rightBoards : leftBoards;
  const maxNumberOfMoveBoards = targetBoards.filter((board) =>
    board.every((point) => point[2] === board[0][2])
  ).length;

  // z座標の移動量
  // 手前に折る場合は+0.001、奥に折る場合は-0.001移動させる
  const MOVE_Z_OFFSET_FRONT = 0.001;
  const MOVE_Z_OFFSET_BACK = -0.001;

  // 手前に折る
  const handleFoldFrontSide = () => {
    handleFolding(true, MOVE_Z_OFFSET_FRONT);
  };

  // 奥に折る
  const handleFoldBackSide = () => {
    handleFolding(false, MOVE_Z_OFFSET_BACK);
  };

  const handleFolding = (isFront: boolean, zOffset: number) => {
    // step1:折る枚数を計算
    const selectedBoardCount = calculateSelectedBoardCount(
      isFront ? !isFoldingDirectionFront : isFoldingDirectionFront,
      numberOfMoveBoards,
      maxNumberOfMoveBoards
    );

    // step2:板を分類し、折る板と折らない板を処理
    const { foldBoards, notFoldBoards } = processBoardsForFolding(
      targetBoards,
      selectedBoardCount,
      zOffset
    );

    setFoldBoards(foldBoards);
    setNotFoldBoards([
      ...(isMoveBoardsRight ? leftBoards : rightBoards),
      ...notFoldBoards,
    ]);

    // step3:折る方向を更新
    // TODO: ここでInputStepObjectを更新しないようにしたい
    setInputStepObject((prev) => ({
      ...prev,
      [procedureIndex.toString()]: {
        ...prev[procedureIndex.toString()],
        numberOfMoveBoards: selectedBoardCount,
        isFoldingDirectionFront: isFront,
        maxNumberOfMoveBoards,
      },
    }));
  };

  return {
    handleFoldFrontSide,
    handleFoldBackSide,
  };
};

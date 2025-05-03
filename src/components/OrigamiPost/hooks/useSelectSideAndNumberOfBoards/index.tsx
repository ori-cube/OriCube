import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom, useAtomValue } from "jotai";
import {
  calculateSelectedBoardCount,
  processBoardsForFolding,
} from "../../logics/handleFolding";

type UseSelectSideAndNumberOfBoards = () => {
  handleFoldFrontSide: () => void;
  handleFoldBackSide: () => void;
  numberOfMoveBoards: number;
  maxNumberOfMoveBoards: number;
  isFoldingDirectionFront: boolean;
};

export const useSelectSideAndNumberOfBoards: UseSelectSideAndNumberOfBoards =
  () => {
    const currentStep = useAtomValue(currentStepAtom);
    const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

    const procedureIndex = currentStep.procedureIndex;
    const isMoveBoardsRight =
      inputStepObject[procedureIndex.toString()].isMoveBoardsRight;
    const leftBoards = inputStepObject[procedureIndex.toString()].leftBoards;
    const rightBoards = inputStepObject[procedureIndex.toString()].rightBoards;
    const isFoldingDirectionFront =
      inputStepObject[procedureIndex.toString()].isFoldingDirectionFront;
    const numberOfMoveBoards =
      inputStepObject[procedureIndex.toString()].numberOfMoveBoards;

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

      // step3:折る方向を更新
      setInputStepObject((prev) => ({
        ...prev,
        [procedureIndex.toString()]: {
          ...prev[procedureIndex.toString()],
          moveBoards: foldBoards,
          fixBoards: [
            ...(isMoveBoardsRight ? leftBoards : rightBoards),
            ...notFoldBoards,
          ],
          numberOfMoveBoards: selectedBoardCount,
          isFoldingDirectionFront,
          maxNumberOfMoveBoards,
        },
      }));
    };

    return {
      handleFoldFrontSide,
      handleFoldBackSide,
      numberOfMoveBoards,
      maxNumberOfMoveBoards,
      isFoldingDirectionFront,
    };
  };

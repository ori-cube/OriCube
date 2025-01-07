import { Board, Point } from "@/types/model";
import { rotateBoards } from "../../logics/rotateBoards";
import { decideNewProcedure } from "../../logics/decideNewProcedure";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom } from "jotai";

type UseDecideFoldMethod = () => {
  handleDecideFoldMethod: () => void;
};

export const useDecideFoldMethod: UseDecideFoldMethod = () => {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

  const procedureIndex = currentStep.procedureIndex;

  const fixBoards = inputStepObject[procedureIndex.toString()].fixBoards;
  const moveBoards = inputStepObject[procedureIndex.toString()].moveBoards;
  const numberOfMoveBoards =
    inputStepObject[procedureIndex.toString()].numberOfMoveBoards;
  const rotateAxis = inputStepObject[procedureIndex.toString()].rotateAxis;
  const foldingAngle = inputStepObject[procedureIndex.toString()].foldingAngle;
  const isFoldingDirectionFront =
    inputStepObject[procedureIndex.toString()].isFoldingDirectionFront;
  const isMoveBoardsRight =
    inputStepObject[procedureIndex.toString()].isMoveBoardsRight;
  const description = inputStepObject[procedureIndex.toString()].description;

  const handleDecideFoldMethod = () => {
    // moveBoardsを回転した後の板を、fixBoardsに追加する
    if (moveBoards.length === 0) return;
    if (rotateAxis.length === 0) return;

    // TODO: procedureがinputStepObjectと違いがわかりづらいので修正する。
    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    const { foldBoards, notFoldBoards, newProcedure } = decideNewProcedure({
      fixBoards,
      moveBoards,
      numberOfMoveBoards,
      rotateAxis,
      isFoldingDirectionFront,
      isMoveBoardsRight,
      description,
    });

    const rotatedBoards = rotateBoards({
      boards: foldBoards,
      rotateAxis,
      angle: foldingAngle,
      isFoldingDirectionFront: isFoldingDirectionFront,
      isMoveBoardsRight,
    });
    const boards = [...fixBoards, ...rotatedBoards, ...notFoldBoards];

    // boardsの格値を少数第3位までにする
    // これをしないとe^-16のような値が出てきて、板が重なっているかどうかの判定がうまくいかない
    const roundedBoards = boards.map((board) =>
      board.map(
        (point) => point.map((v) => Math.round(v * 1000) / 1000) as Point
      )
    );

    setCurrentStep({
      inputStep: "axis",
      procedureIndex: procedureIndex + 1,
    });
    setInputStepObject((prev) => ({
      ...prev,
      [procedureIndex.toString()]: {
        ...prev[procedureIndex.toString()],
        fixBoards: notFoldBoards,
        moveBoards: foldBoards,
      },
      [procedureIndex + 1]: {
        selectedPoints: [],
        rightBoards: [],
        leftBoards: [],
        isMoveBoardsRight: false,
        rotateAxis: [],
        numberOfMoveBoards: 0,
        maxNumberOfMoveBoards: 0,
        isFoldingDirectionFront: true,
        fixBoards: roundedBoards,
        moveBoards: [],
        foldingAngle: 180,
        description: "",
      },
    }));
  };

  return {
    handleDecideFoldMethod,
  };
};

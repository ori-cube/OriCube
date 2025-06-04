/**
 * step3(折り方を選択画面)で次へを押した際の処理
 *
 *
 */

import { Board, Point } from "@/types/model";
import { rotateBoards } from "../../logics/rotateBoards";
import { getFoldAndNotFoldBoards } from "../../logics/decideNewProcedure";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom } from "jotai";

type UseDecideFoldMethod = (props: {
  // TODO: ここの命名の見直し
  fixBoards: Board[];
  moveBoards: Board[];
}) => {
  handleDecideFoldMethod: () => void;
};

export const useDecideFoldMethod: UseDecideFoldMethod = ({
  fixBoards,
  moveBoards,
}) => {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

  const procedureIndex = currentStep.procedureIndex;

  const step = inputStepObject[procedureIndex.toString()];

  // const leftBoards = step.leftBoards;
  // const rightBoards = step.rightBoards;
  const numberOfMoveBoards = step.numberOfMoveBoards;
  const rotateAxis = step.rotateAxis;
  const foldingAngle = step.foldingAngle;
  const isFoldingDirectionFront = step.isFoldingDirectionFront;
  const isMoveBoardsRight = step.isMoveBoardsRight;

  const handleDecideFoldMethod = () => {
    // moveBoardsを回転した後の板を、fixBoardsに追加する
    if (moveBoards.length === 0) return;
    if (rotateAxis.length === 0) return;

    /**
     * 命名をどうにかしたい
     * foldBoardsとfixBoardsの違いなどが一目でわからない
     * 関数も何をする関数なのかわからない
     */
    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    console.log("moveBoards", moveBoards);
    console.log("numberOfMoveBoards", numberOfMoveBoards);

    const { foldBoards, notFoldBoards } = getFoldAndNotFoldBoards(
      moveBoards,
      numberOfMoveBoards
    );

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
    setInputStepObject((prev) => {
      // 現在のデータより先の手順がある場合削除するようにする。
      const newStepObject = Object.keys(prev)
        .filter((key) => parseInt(key) <= procedureIndex)
        .reduce(
          (obj, key) => ({
            ...obj,
            [key]: prev[key],
          }),
          {}
        );

      return {
        ...newStepObject,
        [procedureIndex.toString()]: {
          ...prev[procedureIndex.toString()],
          fixBoards: fixBoards,
          moveBoards: foldBoards,
        },
        [procedureIndex + 1]: {
          type: "Base",
          initialBoards: roundedBoards,
          selectedPoints: [],
          rightBoards: [],
          leftBoards: [],
          isMoveBoardsRight: false,
          rotateAxis: [],
          numberOfMoveBoards: 0,
          maxNumberOfMoveBoards: 0,
          isFoldingDirectionFront: true,
          fixBoards: [],
          moveBoards: [],
          foldingAngle: 180,
          description: "",
        },
      };
    });
  };

  return {
    handleDecideFoldMethod,
  };
};

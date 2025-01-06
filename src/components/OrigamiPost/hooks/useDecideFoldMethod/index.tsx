import { Board, Point } from "@/types/model";
import { Procedure } from "@/types/model";
import { rotateBoards } from "../../logics/rotateBoards";
import { decideNewProcedure } from "../../logics/decideNewProcedure";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { useAtom } from "jotai";

type UseDecideFoldMethod = (props: {
  fixBoards: Board[];
  moveBoards: Board[];
  numberOfMoveBoards: number;
  rotateAxis: [Point, Point] | [];
  isFoldingDirectionFront: boolean;
  isMoveBoardsRight: boolean;
  origamiDescription: string;
  foldingAngle: number;
  procedure: Procedure;
  setProcedure: React.Dispatch<React.SetStateAction<Procedure>>;
  setFixBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  setMoveBoards: React.Dispatch<React.SetStateAction<Board[]>>;
}) => {
  handleDecideFoldMethod: () => void;
};

export const useDecideFoldMethod: UseDecideFoldMethod = ({
  fixBoards,
  moveBoards,
  numberOfMoveBoards,
  rotateAxis,
  isFoldingDirectionFront,
  isMoveBoardsRight,
  origamiDescription,
  foldingAngle,
  procedure,
  setProcedure,
  setFixBoards,
  setMoveBoards,
}) => {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const procedureIndex = currentStep.procedureIndex;

  const handleDecideFoldMethod = () => {
    // moveBoardsを回転した後の板を、fixBoardsに追加する
    if (moveBoards.length === 0) return;
    if (rotateAxis.length === 0) return;

    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    const { foldBoards, notFoldBoards, newProcedure } = decideNewProcedure({
      fixBoards,
      moveBoards,
      numberOfMoveBoards,
      rotateAxis,
      isFoldingDirectionFront,
      isMoveBoardsRight,
      origamiDescription,
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

    // setRotateAxis([]);
    // setSelectedPoints([]);
    // setNumberOfMoveBoards(0);
    // setOrigamiDescription("");
    // setFoldingAngle(180);
    setFixBoards(roundedBoards);
    setMoveBoards([]);
    // setInputStep("axis");
    // setProcedureIndex(procedureIndex + 1);
    setCurrentStep({
      inputStep: "axis",
      procedureIndex: procedureIndex + 1,
    });
    setProcedure({ ...procedure, [procedureIndex]: newProcedure });
  };

  return {
    handleDecideFoldMethod,
  };
};

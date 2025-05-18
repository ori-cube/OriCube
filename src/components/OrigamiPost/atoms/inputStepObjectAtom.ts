import { atom } from "jotai";
import { Board, BaseStep } from "@/types/model";

const initialBoard: Board = [
  [20, 20, 0],
  [-20, 20, 0],
  [-20, -20, 0],
  [20, -20, 0],
];

/**
 * ここでは、BaseStepのみを扱う
 * ConvolutionStepに関しては、どう実装するか未定のため
 */
type InputStep = BaseStep;

export type InputStepObject = {
  [key: string]: InputStep;
};

export const inputStepObjectAtom = atom<InputStepObject>({
  "1": {
    type: "Base",
    selectedPoints: [],
    rightBoards: [],
    leftBoards: [],
    isMoveBoardsRight: false,
    numberOfMoveBoards: 0,
    maxNumberOfMoveBoards: 0,
    isFoldingDirectionFront: true,
    foldingAngle: 180,
    description: "",
    fixBoards: [initialBoard],
    moveBoards: [],
    rotateAxis: [],
  },
});

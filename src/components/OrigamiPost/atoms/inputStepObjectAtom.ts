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
    rotateAxis: [],
    numberOfMoveBoards: 0,
    maxNumberOfMoveBoards: 0,
    isFoldingDirectionFront: true,
    fixBoards: [initialBoard],
    moveBoards: [],
    foldingAngle: 180,
    description: "",
  },
});

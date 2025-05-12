import { atom } from "jotai";
import { Board, Procedure } from "@/types/model";

const initialBoard: Board = [
  [20, 20, 0],
  [-20, 20, 0],
  [-20, -20, 0],
  [20, -20, 0],
];

export const inputStepObjectAtom = atom<Procedure>({
  "1": {
    type: "Base",
    description: "",
    fixBoards: [initialBoard],
    moveBoards: [],
    rotateAxis: [],
    selectedPoints: [],
    rightBoards: [],
    leftBoards: [],
    isMoveBoardsRight: false,
    numberOfMoveBoards: 0,
    maxNumberOfMoveBoards: 0,
    isFoldingDirectionFront: true,
    foldingAngle: 180,
  },
});

import { atom } from "jotai";
import { Point, Board, RotateAxis } from "@/types/model";

const initialBoard: Board = [
  [20, 20, 0],
  [-20, 20, 0],
  [-20, -20, 0],
  [20, -20, 0],
];

type InputStep = {
  selectedPoints: Point[];
  rightBoards: Board[];
  leftBoards: Board[];
  isMoveBoardsRight: boolean;
  rotateAxis: RotateAxis;
  numberOfMoveBoards: number;
  maxNumberOfMoveBoards: number;
  isFoldingDirectionFront: boolean;
  fixBoards: Board[];
  moveBoards: Board[];
  foldingAngle: number;
  description: string;
};

export type InputStepObject = {
  [key: string]: InputStep;
};

export const inputStepObjectAtom = atom<InputStepObject>({
  "1": {
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

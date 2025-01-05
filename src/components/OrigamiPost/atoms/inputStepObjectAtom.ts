import { atom } from "jotai";
import { Point, Board, RotateAxis } from "@/types/model";

type InputStep = {
  selectedPoints: Point[];
  rightBoards: Board[];
  leftBoards: Board[];
  isMoveBoardsRight: boolean;
  rotateAxis: RotateAxis;
  fixBoards: Board[];
  moveBoards: Board[];
  description: string;
};

type InputStepObject = {
  [key: string]: InputStep;
};

export const inputStepObjectAtom = atom<InputStepObject>({
  "1": {
    selectedPoints: [],
    rightBoards: [],
    leftBoards: [],
    isMoveBoardsRight: false,
    rotateAxis: [],
    fixBoards: [],
    moveBoards: [],
    description: "",
  },
});

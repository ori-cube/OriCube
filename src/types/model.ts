export type Point = [number, number, number];
export type Board = Point[];
export type RotateAxis = [Point, Point] | [];

export type BaseStep = {
  type: "Base";
  // 折り方確認の描画に必要なパラメータ
  description: string;
  fixBoards: Board[];
  moveBoards: Board[];
  rotateAxis: RotateAxis;
  // 折り方入力の際に必要なデータ
  selectedPoints: Point[];
  rightBoards: Board[];
  leftBoards: Board[];
  isMoveBoardsRight: boolean;
  numberOfMoveBoards: number;
  maxNumberOfMoveBoards: number;
  isFoldingDirectionFront: boolean;
  foldingAngle: number;
};
// 開いて畳むやつ用
export type ConvolutionStep = {
  type: "convolution";
  description: string;
  nodes: number[][];
  boards: number[][];
  moveNodesIdx: number[];
  rotateAxes: number[][][];
  fixBoards: Board[];
};
export type Step = BaseStep | ConvolutionStep;

/*
1: Step,
2: Step,
3: Step,
...
**/
export type StepObject = {
  [key: string]: Step;
};

// 最終的に保存するもの
export type Model = {
  id: string;
  name: string;
  color: string;
  imageUrl: string;
  searchKeyword?: string[];
  procedure: StepObject;
};

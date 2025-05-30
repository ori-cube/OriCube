type Point = [number, number, number];
type Board = Point[];
type RotateAxis = [Point, Point] | [];

export type BaseStep = {
  type: "Base";
  // 折り方解説の描画に必要なパラメータ
  description: string;
  fixBoards: Board[];
  moveBoards: Board[];
  rotateAxis: RotateAxis;
  // 折り方入力の際に必要なデータ(これがあれば編集も可能)
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
type ConvolutionStep = {
  type: "convolution";
  nodes: number[][];
  boards: number[][];
  moveNodesIdx: number[];
  rotateAxes: number[][][];
};
type Step = BaseStep | ConvolutionStep;

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

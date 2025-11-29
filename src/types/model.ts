export type Point = [number, number, number];
export type Board = Point[];
export type RotateAxis = [Point, Point] | [];

// タグの色スタイル定義
export type ColorStyle =
  | "purple-blue" // 紫色のグラデーション
  | "pink-red" // ピンクから赤のグラデーション
  | "blue-cyan" // 青から水色のグラデーション
  | "green-cyan" // 緑から水色のグラデーション
  | "pink-yellow" // ピンクから黄色のグラデーション
  | "beige-peach"; // ベージュからピーチのグラデーション

// タグの型定義
export type Tag = {
  title: string;
  colorStyle: ColorStyle;
};

export type BaseStep = {
  type: "Base";
  // 折り方解説の描画に必要なパラメータ
  description: string;
  fixBoards: Board[];
  moveBoards: Board[];
  rotateAxis: RotateAxis;
  // 折り方入力の際に必要なデータ
  initialBoards: Board[];
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
export type Procedure = {
  [key: string]: Step;
};

// 最終的に保存するモデルの型
export type Model = {
  id: string;
  name: string;
  color: string;
  imageUrl: string;
  searchKeyword?: string[];
  procedure: Procedure;
  difficulty?: 0 | 1 | 2 | 3 | 4 | 5;
  tags?: Tag[];
};

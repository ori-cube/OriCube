export type Point = [number, number, number];
export type Board = Point[];
export type RotateAxis = [Point, Point] | [];

export type Model = {
  id?: string;
  name: string;
  imageUrl?: string;
  searchKeyword?: string[];
  color: string;
  procedure: Procedure;
};

type BaseProcedure = {
  description: string;
  fixBoards: Board[];
  moveBoards: Board[];
  rotateAxis: RotateAxis;
};

type ConvolutionProcedure = BaseProcedure & {
  type: "convolution";
  nodes: number[][];
  boards: number[][];
  moveNodesIdx: number[];
  rotateAxes: number[][][];
};

type OtherProcedure = BaseProcedure & {
  type?: string;
};

type ProcedureEntry = ConvolutionProcedure | OtherProcedure;

export type Procedure = {
  [key: string]: ProcedureEntry;
};

export function isConvolutionProcedure(
  procedure: ProcedureEntry
): procedure is ConvolutionProcedure {
  return procedure.type === "convolution";
}

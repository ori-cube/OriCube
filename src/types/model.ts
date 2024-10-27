export type Model = {
  name: string;
  color: string;
  procedure: Procedure;
};

type BaseProcedure = {
  description: string;
  fixBoards: number[][][];
  moveBoards: number[][][];
  rotateAxis: number[][];
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

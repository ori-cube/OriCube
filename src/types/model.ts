export type Model = {
  name: string;
  procedure: Procedure;
};

export type Procedure = {
  [key: string]: {
    fixBoards: number[][][];
    moveBoards: number[][][];
    rotateAxis: number[][];
  };
};

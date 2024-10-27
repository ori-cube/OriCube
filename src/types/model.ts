export type Model = {
  name: string;
  procedure: Procedure;
};

export type Procedure = {
  [key: string]: {
    description: string;
    fixBoards: number[][][];
    moveBoards: number[][][];
    rotateAxis: number[][];
  };
};

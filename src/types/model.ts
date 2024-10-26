export type Model = {
  name: string;
  color: string;
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

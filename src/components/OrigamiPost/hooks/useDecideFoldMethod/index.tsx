import { Board, Point } from "@/types/three";
import { Procedure } from "@/types/model";
import { rotateBoards } from "../../logics/rotateBoards";
import { Step } from "../../FoldMethodControlPanel";

type UseDecideFoldMethod = (props: {
  fixBoards: Board[];
  moveBoards: Board[];
  numberOfMoveBoards: number;
  rotateAxis: [Point, Point] | [];
  isFoldingDirectionFront: boolean;
  isMoveBoardsRight: boolean;
  origamiDescription: string;
  foldingAngle: number;
  procedureIndex: number;
  procedure: Procedure;
  setInputStep: React.Dispatch<React.SetStateAction<Step>>;
  setProcedureIndex: React.Dispatch<React.SetStateAction<number>>;
  setProcedure: React.Dispatch<React.SetStateAction<Procedure>>;
  setFixBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  setMoveBoards: React.Dispatch<React.SetStateAction<Board[]>>;
}) => {
  handleDecideFoldMethod: () => void;
};

export const useDecideFoldMethod: UseDecideFoldMethod = ({
  fixBoards,
  moveBoards,
  numberOfMoveBoards,
  rotateAxis,
  isFoldingDirectionFront,
  isMoveBoardsRight,
  origamiDescription,
  foldingAngle,
  procedureIndex,
  procedure,
  setInputStep,
  setProcedureIndex,
  setProcedure,
  setFixBoards,
  setMoveBoards,
}) => {
  const handleDecideFoldMethod = () => {
    // moveBoardsを回転した後の板を、fixBoardsに追加する
    if (moveBoards.length === 0) return;
    if (rotateAxis.length === 0) return;

    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    const { foldBoards, notFoldBoards, newProcedure } = decideNewProcedure({
      fixBoards,
      moveBoards,
      numberOfMoveBoards,
      rotateAxis,
      isFoldingDirectionFront,
      isMoveBoardsRight,
      origamiDescription,
    });

    const rotatedBoards = rotateBoards({
      boards: foldBoards,
      rotateAxis,
      angle: foldingAngle,
      isFoldingDirectionFront: isFoldingDirectionFront,
      isMoveBoardsRight,
    });
    const boards = [...fixBoards, ...rotatedBoards, ...notFoldBoards];

    // boardsの格値を少数第3位までにする
    // これをしないとe^-16のような値が出てきて、板が重なっているかどうかの判定がうまくいかない
    const roundedBoards = boards.map((board) =>
      board.map(
        (point) => point.map((v) => Math.round(v * 1000) / 1000) as Point
      )
    );

    // setRotateAxis([]);
    // setSelectedPoints([]);
    // setNumberOfMoveBoards(0);
    // setOrigamiDescription("");
    // setFoldingAngle(180);
    setFixBoards(roundedBoards);
    setMoveBoards([]);
    setInputStep("axis");
    setProcedureIndex(procedureIndex + 1);
    setProcedure({ ...procedure, [procedureIndex]: newProcedure });
  };

  return {
    handleDecideFoldMethod,
  };
};

type DecideNewProcedure = (props: {
  fixBoards: Board[];
  moveBoards: Board[];
  numberOfMoveBoards: number;
  rotateAxis: [Point, Point];
  isFoldingDirectionFront: boolean;
  isMoveBoardsRight: boolean;
  origamiDescription: string;
}) => {
  foldBoards: Board[];
  notFoldBoards: Board[];
  newProcedure: Procedure[number];
};

const decideNewProcedure: DecideNewProcedure = ({
  fixBoards,
  moveBoards,
  numberOfMoveBoards,
  rotateAxis,
  isFoldingDirectionFront,
  isMoveBoardsRight,
  origamiDescription,
}) => {
  let xyPlaneBoards: Board[] = [];
  const notXyPlaneBoards: Board[] = [];
  for (let i = 0; i < moveBoards.length; i++) {
    const board = moveBoards[i];
    const isEquallyZ = board.every((point) => point[2] === board[0][2]);
    if (isEquallyZ) {
      xyPlaneBoards.push(board);
    } else {
      notXyPlaneBoards.push(board);
    }
  }

  // xy平面上の板をz座標が大きい順にソート
  xyPlaneBoards = xyPlaneBoards.sort((a, b) => b[0][2] - a[0][2]);

  const foldBoards = [
    ...xyPlaneBoards.slice(0, numberOfMoveBoards),
    ...notXyPlaneBoards,
  ];
  const notFoldBoards = xyPlaneBoards.slice(numberOfMoveBoards);

  // rotateAxisをソートする。
  let sortedRotateAxis = rotateAxis;
  if (isMoveBoardsRight) {
    sortedRotateAxis =
      rotateAxis[0][0] < rotateAxis[1][0]
        ? rotateAxis
        : [rotateAxis[1], rotateAxis[0]];
  } else {
    sortedRotateAxis =
      rotateAxis[0][0] > rotateAxis[1][0]
        ? rotateAxis
        : [rotateAxis[1], rotateAxis[0]];
  }

  let z = 0;
  //  回転軸の2つのz座標の差の絶対値が0.01以下の場合、z座標を一番大きい板のz座標に合わせる
  if (Math.abs(sortedRotateAxis[0][2] - sortedRotateAxis[1][2]) < 0.01) {
    for (let i = 0; i < foldBoards.length; i++) {
      const board = foldBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        if (isFoldingDirectionFront) {
          if (z === undefined || board[0][2] > z) {
            z = board[0][2];
          }
        } else {
          if (z === undefined || board[0][2] < z) {
            z = board[0][2];
          }
        }
      }
    }
  }

  // sortedRotateAxisのz座標にzを加える
  sortedRotateAxis = sortedRotateAxis.map((point) => {
    return [point[0], point[1], point[2] + z];
  }) as [Point, Point];

  console.log("sortedRotateAxis");

  // isFoldingDirectionFrontがfalseなら、sortedRotateAxisの順序を逆にする
  if (isFoldingDirectionFront === false) {
    sortedRotateAxis = [sortedRotateAxis[1], sortedRotateAxis[0]];
  }

  // Procedureを作成する
  const newProcedure = {
    description: origamiDescription,
    fixBoards: [...fixBoards, ...notFoldBoards],
    moveBoards: foldBoards,
    rotateAxis: sortedRotateAxis,
  } as Procedure[number];

  return { foldBoards, notFoldBoards, newProcedure };
};

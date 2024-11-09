import { sortBoardCoordinate } from "./sortBoardCoordinate";

type Point = [number, number, number];
type Board = Point[];

type RotateAxis = [Point, Point];

type Props = {
  board: Board;
  rotateAxis: RotateAxis;
};

type SeparateBoard = (props: Props) => { leftBoard: Board; rightBoard: Board };

export const separateBoard: SeparateBoard = ({ board, rotateAxis }) => {
  const leftBoard: Board = [];
  const rightBoard: Board = [];

  // boardの各辺とrotateAxisの交点を求める
  function getAllIntersections() {
    const intersections: Point[] = [];
    for (let i = 0; i < board.length; i++) {
      const p1 = board[i];
      const p2 = board[(i + 1) % board.length];
      const intersection = getIntersection({
        p1,
        p2,
        q1: rotateAxis[0],
        q2: rotateAxis[1],
      });
      if (intersection) {
        // 重複を避けるため、すでに求めた交点と同じ座標の場合は追加しない
        const isDuplicated = intersections.some(
          (p) =>
            p[0] === intersection[0] &&
            p[1] === intersection[1] &&
            p[2] === intersection[2]
        );
        if (!isDuplicated) {
          intersections.push(intersection);
        }
      }
    }

    return intersections;
  }

  const allIntersections = getAllIntersections();

  if (allIntersections.length !== 2) {
    return { leftBoard: [], rightBoard: [] };
  }

  // 板を左右(leftBoard, rightBoard)に分ける
  for (let i = 0; i < board.length; i++) {
    const p = board[i];
    const isLeft = isOnLeftSide({
      point: p,
      axis1: rotateAxis[0],
      axis2: rotateAxis[1],
    });
    if (isLeft) {
      leftBoard.push(p);
    } else {
      rightBoard.push(p);
    }
  }

  // leftBoardとrightBoardにintersectionを重複を避けて追加
  allIntersections.forEach((p) => {
    const isDuplicated = leftBoard.some(
      (f) => f[0] === p[0] && f[1] === p[1] && f[2] === p[2]
    );
    if (!isDuplicated) leftBoard.push(p);

    const isDuplicated2 = rightBoard.some(
      (m) => m[0] === p[0] && m[1] === p[1] && m[2] === p[2]
    );
    if (!isDuplicated2) rightBoard.push(p);
  });

  // 座標をソート
  const sortedLeftBoard = sortBoardCoordinate({
    board: leftBoard,
    isFrontSide: true,
  });
  const sortedRightBoard = sortBoardCoordinate({
    board: rightBoard,
    isFrontSide: true,
  });

  return {
    leftBoard: sortedLeftBoard,
    rightBoard: sortedRightBoard,
  };
};

type IsOnLeftSide = (props: {
  point: Point;
  axis1: Point;
  axis2: Point;
}) => boolean;

const isOnLeftSide: IsOnLeftSide = ({ point, axis1, axis2 }) => {
  // 2つのベクトルの外積が正ならば左側にある
  // TODO: 真横の場合はどうするか
  const v1 = [axis2[0] - axis1[0], axis2[1] - axis1[1]];
  const v2 = [point[0] - axis1[0], point[1] - axis1[1]];
  return v1[0] * v2[1] - v1[1] * v2[0] > 0;
};

/*
媒介変数t, uを用いたベクトル方程式による交点の算出
p1 + t(p2 - p1) = q1 + u(q2 - q1)
これを整理して
t = ((q1[1] - p1[1])(p2[0] - p1[0]) - (q1[0] - p1[0])(p2[1] - p1[1])) / ((q2[1] - q1[1])(p2[0] - p1[0]) - (q2[0] - q1[0])(p2[1] - p1[1]))
u = ((q1[1] - p1[1])(q2[0] - q1[0]) - (q1[0] - p1[0])(q2[1] - q1[1])) / ((q2[1] - q1[1])(p2[0] - p1[0]) - (q2[0] - q1[0])(p2[1] - p1[1]))
**/
type GetIntersection = (props: {
  p1: Point;
  p2: Point;
  q1: Point;
  q2: Point;
}) => Point | null;

const getIntersection: GetIntersection = ({ p1, p2, q1, q2 }) => {
  const denominator =
    (q2[0] - q1[0]) * (p2[1] - p1[1]) - (q2[1] - q1[1]) * (p2[0] - p1[0]);

  if (denominator === 0) return null; // 平行で交わらない

  const t =
    ((q1[1] - p1[1]) * (q2[0] - q1[0]) - (q1[0] - p1[0]) * (q2[1] - q1[1])) /
    denominator;
  const u =
    ((q1[1] - p1[1]) * (p2[0] - p1[0]) - (q1[0] - p1[0]) * (p2[1] - p1[1])) /
    denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    // 交点が見つかった場合の座標
    const x = p1[0] + t * (p2[0] - p1[0]);
    const y = p1[1] + t * (p2[1] - p1[1]);
    const z = p1[2] + t * (p2[2] - p1[2]); // board は z=0 なので z=0 のまま

    return [x, y, z];
  }

  return null; // 交点がない
};

/* 
板と回転軸のすべての交点を求める関数。
**/
import { Point, Board, RotateAxis } from "@/types/model";

type Props = {
  board: Board;
  rotateAxis: RotateAxis;
};

type GetAllIntersections = (props: Props) => Point[];

export const getAllIntersections: GetAllIntersections = ({
  board,
  rotateAxis,
}) => {
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
      const isOnTheBoard = isIntersectionOnTheBoard({
        intersection,
        board,
      });
      if (!isOnTheBoard) continue;
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
  //   const u =
  //     ((q1[1] - p1[1]) * (p2[0] - p1[0]) - (q1[0] - p1[0]) * (p2[1] - p1[1])) /
  //     denominator;

  const x = p1[0] + t * (p2[0] - p1[0]);
  const y = p1[1] + t * (p2[1] - p1[1]);
  const z = p1[2] + t * (p2[2] - p1[2]);

  return [x, y, z];
};

/*
交点が板上にあるかどうかを判定する関数
**/

type IsIntersectionOnTheBoard = (props: {
  intersection: Point;
  board: Board;
}) => boolean;

export const isIntersectionOnTheBoard: IsIntersectionOnTheBoard = ({
  intersection,
  board,
}) => {
  // board上の各辺との交点があるかどうかを判定
  for (let i = 0; i < board.length; i++) {
    const p1 = board[i];
    const p2 = board[(i + 1) % board.length];

    // intersection-p1とintersection-p2の外積が0の場合は、p1, p2, intersectionは一直線上にある
    const v1 = [
      p1[0] - intersection[0],
      p1[1] - intersection[1],
      p1[2] - intersection[2],
    ];
    const v2 = [
      p2[0] - intersection[0],
      p2[1] - intersection[1],
      p2[2] - intersection[2],
    ];

    const crossProduct = [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0],
    ];

    console.log("crossProduct", crossProduct);

    // crossProductの値が0.001より小さい場合は0とみなす
    if (crossProduct[0] < 0.001) crossProduct[0] = 0;
    if (crossProduct[1] < 0.001) crossProduct[1] = 0;
    if (crossProduct[2] < 0.001) crossProduct[2] = 0;

    // すべての外積が0でない場合、intersectionは返上にない
    if (
      crossProduct[0] !== 0 ||
      crossProduct[1] !== 0 ||
      crossProduct[2] !== 0
    ) {
      continue;
    }

    // intersectionが辺の内側にあるかどうかを判定
    const isInsideX =
      Math.min(p1[0], p2[0]) <= intersection[0] &&
      intersection[0] <= Math.max(p1[0], p2[0]);
    const isInsideY =
      Math.min(p1[1], p2[1]) <= intersection[1] &&
      intersection[1] <= Math.max(p1[1], p2[1]);
    const isInsideZ =
      Math.min(p1[2], p2[2]) <= intersection[2] &&
      intersection[2] <= Math.max(p1[2], p2[2]);

    if (isInsideX && isInsideY && isInsideZ) {
      return true;
    }
  }

  return false;
};

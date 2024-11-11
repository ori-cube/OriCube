/* 
板と回転軸のすべての交点を求める関数。
**/

type Point = [number, number, number];
type Board = Point[];

type RotateAxis = [Point, Point];

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
  const u =
    ((q1[1] - p1[1]) * (p2[0] - p1[0]) - (q1[0] - p1[0]) * (p2[1] - p1[1])) /
    denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    // 交点が見つかった場合の座標
    const x = p1[0] + t * (p2[0] - p1[0]);
    const y = p1[1] + t * (p2[1] - p1[1]);
    const z = p1[2] + t * (p2[2] - p1[2]);

    return [x, y, z];
  }

  return null; // 交点がない
};

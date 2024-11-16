/* 
板の頂点を左回りまたは右回りにソートする関数。
isFrontSideがtrueの場合は左回り、falseの場合は右回りにソートする。
**/
import { Point, Board } from "@/types/three";

type Props = {
  board: Board;
  isFrontSide: boolean;
};

type SortBoardCoordinate = (props: Props) => Point[];

export const sortBoardCoordinate: SortBoardCoordinate = ({
  board,
  isFrontSide,
}) => {
  // boardの中心点を計算
  const center = board
    .reduce(
      (acc, point) => {
        acc[0] += point[0];
        acc[1] += point[1];
        acc[2] += point[2];
        return acc;
      },
      [0, 0, 0] as Point
    )
    .map((val) => val / board.length);

  // 各頂点の中心からの角度を計算してソートする。
  const sortedBoard = board
    .map((point) => {
      const angle = Math.atan2(point[1] - center[1], point[0] - center[0]);
      return { point, angle };
    })
    .sort((a, b) => (isFrontSide ? a.angle - b.angle : b.angle - a.angle))
    .map((obj) => obj.point);

  return sortedBoard;
};

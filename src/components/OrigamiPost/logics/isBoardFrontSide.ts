/*
板の面裏を判定する関数
boardには多角形の頂点の座標が左回りまたは右回りに格納されている
左回りの場合は面裏、右回りの場合は面表と判定する
NOTE: boardがソートされていることが前提
**/
import { Board } from "@/types/model";

type IsBoardFrontSide = (props: { board: Board }) => boolean;

export const isBoardFrontSide: IsBoardFrontSide = ({ board }) => {
  // まず、z座標を無視して2次元に射影
  const points2D = board.map(([x, y]) => [x, y] as [number, number]);

  // 符号付き面積を求める（Shoelace formula）
  let area = 0;
  const n = points2D.length;

  for (let i = 0; i < n; i++) {
    const [x1, y1] = points2D[i];
    const [x2, y2] = points2D[(i + 1) % n];
    area += x1 * y2 - y1 * x2;
  }

  // 面積が正なら右回り（表）、負なら左回り（裏）
  return area > 0;
};

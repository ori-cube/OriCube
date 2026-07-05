import * as THREE from "three";
import { Board, BoardPiece, FoldLine } from "../../types";
import { isPointLeftOfLine } from "../isPointLeftOfLine";

/**
 * 動く片と固定される片
 */
export interface MovingAndStaticPieces {
  /** 折りで回転する片（ドラッグした頂点を含む側） */
  movingPiece: BoardPiece;
  /** 固定される片 */
  staticPiece: BoardPiece;
}

/**
 * 分割された2つの片のうち、どちらが折りで動く片かを決定する
 *
 * @param pieces - 分割された2つの片（separateBoardの出力。順序は問わない）
 * @param originalPoint - ドラッグした頂点の元の位置
 * @param foldLine - 折り線
 * @returns 動く片と固定される片。originalPointが折り線上にある場合はnull
 *
 * @description
 * - 折り線に対してドラッグした頂点（originalPoint）と同じ側にある片が
 *   折りで動く
 * - 片がどちら側にあるかは、折り畳み空間のポリゴンの折り線上にない頂点を
 *   代表として判定する
 * - 折り線はドラッグ前後の点を結ぶ線分の垂直二等分線であるため、
 *   originalPointが折り線上に乗ることは通常ないが、防御的にnullを返す
 */
export const selectMovingBoard = (
  pieces: [BoardPiece, BoardPiece],
  originalPoint: THREE.Vector3,
  foldLine: FoldLine
): MovingAndStaticPieces | null => {
  const originalPointSide = isPointLeftOfLine(
    originalPoint,
    foldLine.start,
    foldLine.end
  );
  if (originalPointSide === null) return null;

  const [firstPiece, secondPiece] = pieces;
  const firstPieceSide = getBoardSide(firstPiece.polygon, foldLine);

  // 全頂点が折り線上にある退化した片（separateBoardの出力では起こり得ない）
  if (firstPieceSide === null) return null;

  return firstPieceSide === originalPointSide
    ? { movingPiece: firstPiece, staticPiece: secondPiece }
    : { movingPiece: secondPiece, staticPiece: firstPiece };
};

/**
 * 板が折り線のどちら側にあるかを判定する
 *
 * 折り線上にない最初の頂点を代表として判定する（分割された板の頂点は
 * 折り線を跨がないため、1つの頂点で板全体の側が決まる）
 */
const getBoardSide = (board: Board, foldLine: FoldLine): boolean | null => {
  for (const vertex of board) {
    const side = isPointLeftOfLine(vertex, foldLine.start, foldLine.end);
    if (side !== null) return side;
  }
  return null;
};

import * as THREE from "three";
import { Board, FoldLine } from "../../types";
import { isPointLeftOfLine } from "../isPointLeftOfLine";

/**
 * 動く板と固定される板
 */
export interface MovingAndStaticBoards {
  /** 折りで回転する板（ドラッグした頂点を含む側） */
  movingBoard: Board;
  /** 固定される板 */
  staticBoard: Board;
}

/**
 * 分割された2つの板のうち、どちらが折りで動く板かを決定する
 *
 * @param boards - 分割された2つの板（separateBoardの出力。順序は問わない）
 * @param originalPoint - ドラッグした頂点の元の位置
 * @param foldLine - 折り線
 * @returns 動く板と固定される板。originalPointが折り線上にある場合はnull
 *
 * @description
 * - 折り線に対してドラッグした頂点（originalPoint）と同じ側にある板が
 *   折りで動く
 * - 板がどちら側にあるかは、折り線上にない頂点を代表として判定する
 * - 折り線はドラッグ前後の点を結ぶ線分の垂直二等分線であるため、
 *   originalPointが折り線上に乗ることは通常ないが、防御的にnullを返す
 */
export const selectMovingBoard = (
  boards: [Board, Board],
  originalPoint: THREE.Vector3,
  foldLine: FoldLine
): MovingAndStaticBoards | null => {
  const originalPointSide = isPointLeftOfLine(
    originalPoint,
    foldLine.start,
    foldLine.end
  );
  if (originalPointSide === null) return null;

  const [firstBoard, secondBoard] = boards;
  const firstBoardSide = getBoardSide(firstBoard, foldLine);

  // 全頂点が折り線上にある退化した板（separateBoardの出力では起こり得ない）
  if (firstBoardSide === null) return null;

  return firstBoardSide === originalPointSide
    ? { movingBoard: firstBoard, staticBoard: secondBoard }
    : { movingBoard: secondBoard, staticBoard: firstBoard };
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

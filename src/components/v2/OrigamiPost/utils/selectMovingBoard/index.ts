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
 * @param leftBoard - 折り線の左側の板（separateBoardの出力）
 * @param rightBoard - 折り線の右側の板
 * @param originalPoint - ドラッグした頂点の元の位置
 * @param foldLine - 折り線
 * @returns 動く板と固定される板。originalPointが折り線上にある場合はnull
 *
 * @description
 * - ドラッグした頂点（originalPoint）を含む側の板が折りで動く
 * - 折り線はドラッグ前後の点を結ぶ線分の垂直二等分線であるため、
 *   originalPointが折り線上に乗ることは通常ないが、防御的にnullを返す
 */
export const selectMovingBoard = (
  leftBoard: Board,
  rightBoard: Board,
  originalPoint: THREE.Vector3,
  foldLine: FoldLine
): MovingAndStaticBoards | null => {
  const isLeft = isPointLeftOfLine(originalPoint, foldLine.start, foldLine.end);

  if (isLeft === null) return null;

  return isLeft
    ? { movingBoard: leftBoard, staticBoard: rightBoard }
    : { movingBoard: rightBoard, staticBoard: leftBoard };
};

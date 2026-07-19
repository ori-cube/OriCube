import * as THREE from "three";
import { Board, FoldLine } from "../../types";

/**
 * 板の全頂点を任意の軸周りに回転させた新しい板を返す
 *
 * @param board - 回転対象の板
 * @param axisPoint - 回転軸が通る点
 * @param axisDirection - 回転軸の方向ベクトル（正規化済みであること）
 * @param angle - 回転角（ラジアン、右ねじの法則）
 * @returns 回転後の新しい板（元の板は変更しない）
 *
 * @description
 * - アニメーション自体はピボットGroupの回転で行うが、折り完了時に
 *   最終的な頂点座標を板データへ反映（bake）するために使用する
 * - 将来の多重折りでは、この確定済み座標を次の折りの入力にする
 */
export const rotateBoard = (
  board: Board,
  axisPoint: THREE.Vector3,
  axisDirection: THREE.Vector3,
  angle: number
): Board =>
  board.map((vertex) =>
    vertex
      .clone()
      .sub(axisPoint)
      .applyAxisAngle(axisDirection, angle)
      .add(axisPoint)
  );

/**
 * 板を直線周りに180度回転（XY平面上では鏡映）し、z=0に揃える
 *
 * @param board - 鏡映対象の板
 * @param line - 鏡映の軸となる直線（start/endは無限直線上の2点として扱う）
 * @returns 鏡映後の新しい板（元の板は変更しない）
 *
 * @description
 * 180度回転では軸方向の符号は結果に影響しない。浮動小数の誤差でzが
 * 微小にずれるとリプレイ時の判定が揺れるため、z=0に揃える
 */
export const mirrorBoardAcrossLine = (board: Board, line: FoldLine): Board => {
  const axisDirection = new THREE.Vector3()
    .subVectors(line.end, line.start)
    .normalize();
  return rotateBoard(board, line.start, axisDirection, Math.PI).map(
    (vertex) => new THREE.Vector3(vertex.x, vertex.y, 0)
  );
};

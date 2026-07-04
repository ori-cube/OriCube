import * as THREE from "three";
import { Board } from "../../types";

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

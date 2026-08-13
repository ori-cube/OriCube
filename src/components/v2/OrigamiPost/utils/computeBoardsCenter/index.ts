import * as THREE from "three";
import { LayeredBoard } from "../../types";

/**
 * 板群全体のバウンディングボックス中心を求める
 *
 * @description
 * - 全頂点のバウンディングボックスの中心をXY平面上（z=0）で返す
 * - 頂点の平均（重心）ではなくバウンディングボックスを使うのは、
 *   折りによる頂点の細分（密度の偏り）に影響されず、見た目の
 *   中央に一致させるため
 * - 板が無い場合は原点を返す
 *
 * @param boards - 現在の板群
 * @returns 板群の中心座標（z=0）
 */
export const computeBoardsCenter = (boards: LayeredBoard[]): THREE.Vector3 => {
  const box = new THREE.Box2();

  for (const board of boards) {
    for (const vertex of board.polygon) {
      box.expandByPoint(new THREE.Vector2(vertex.x, vertex.y));
    }
  }

  if (box.isEmpty()) return new THREE.Vector3(0, 0, 0);

  const center = box.getCenter(new THREE.Vector2());
  return new THREE.Vector3(center.x, center.y, 0);
};

import * as THREE from "three";

/**
 * XY平面上で、点が有向直線の左側にあるかを判定する
 *
 * @param point - 判定対象の点
 * @param lineStart - 直線の始点
 * @param lineEnd - 直線の終点
 * @param epsilon - 線上とみなす外積の閾値（デフォルト: 1e-6）
 * @returns 左側ならtrue、右側ならfalse、線上ならnull
 *
 * @description
 * - 直線方向ベクトル(lineStart→lineEnd)と点方向ベクトル(lineStart→point)の
 *   外積のz成分の符号で判定する
 * - XY平面（Z=0）専用。z座標は無視する
 *
 * @example
 * const start = new THREE.Vector3(0, -50, 0);
 * const end = new THREE.Vector3(0, 50, 0);
 * isPointLeftOfLine(new THREE.Vector3(-10, 0, 0), start, end); // true（x負側が左）
 * isPointLeftOfLine(new THREE.Vector3(10, 0, 0), start, end); // false
 * isPointLeftOfLine(new THREE.Vector3(0, 0, 0), start, end); // null（線上）
 */
export const isPointLeftOfLine = (
  point: THREE.Vector3,
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3,
  epsilon: number = 1e-6
): boolean | null => {
  const crossZ =
    (lineEnd.x - lineStart.x) * (point.y - lineStart.y) -
    (lineEnd.y - lineStart.y) * (point.x - lineStart.x);

  if (Math.abs(crossZ) < epsilon) {
    return null;
  }

  return crossZ > 0;
};

import * as THREE from "three";

/**
 * 折り線の情報
 */
export interface FoldLineInfo {
  /** 折り線が通る中点 M = (P1 + P2) / 2 */
  midpoint: THREE.Vector3;
  /** 折り線の方向ベクトル L = (P2 - P1) × N */
  direction: THREE.Vector3;
}

/**
 * 2つの点から折り線の情報を計算する
 *
 * @param p1 - ドラッグ前の頂点位置
 * @param p2 - ドラッグ後の頂点位置
 * @returns 折り線の情報（中点と方向ベクトル）。p1とp2が同じ場合はnull
 *
 * @example
 * const p1 = new THREE.Vector3(0, 0, 0);
 * const p2 = new THREE.Vector3(10, 0, 0);
 * const foldLine = calculateFoldLine(p1, p2);
 * // foldLine.midpoint: (5, 0, 0)
 * // foldLine.direction: (0, -10, 0)
 */
export const calculateFoldLine = (
  p1: THREE.Vector3,
  p2: THREE.Vector3
): FoldLineInfo | null => {
  // 同じ点の場合はnullを返す
  if (p1.equals(p2)) {
    return null;
  }

  // 中点の計算: M = (P1 + P2) / 2
  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

  // ドラッグ方向ベクトルの計算: V = P2 - P1
  const dragDirection = new THREE.Vector3().subVectors(p2, p1);

  // 折り紙の法線ベクトル（Z軸方向、XY平面の法線）
  const normal = new THREE.Vector3(0, 0, 1);

  // 折り線の方向ベクトルの計算: L = V × N
  const direction = new THREE.Vector3().crossVectors(dragDirection, normal);

  return {
    midpoint,
    direction,
  };
};

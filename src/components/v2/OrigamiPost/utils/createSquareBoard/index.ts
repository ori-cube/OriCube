import * as THREE from "three";
import { Board } from "../../types";

/**
 * 初期状態の正方形の板を生成する（XY平面上、Z=0、原点中心）
 *
 * @param size - 正方形の一辺の長さ
 * @returns 反時計回りに順序付けた4頂点の板
 */
export const createSquareBoard = (size: number): Board => {
  const halfSize = size / 2;
  return [
    new THREE.Vector3(-halfSize, -halfSize, 0), // 左下
    new THREE.Vector3(halfSize, -halfSize, 0), // 右下
    new THREE.Vector3(halfSize, halfSize, 0), // 右上
    new THREE.Vector3(-halfSize, halfSize, 0), // 左上
  ];
};

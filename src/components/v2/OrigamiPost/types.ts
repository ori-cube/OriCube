import * as THREE from "three";

/**
 * 折り紙の板（多角形）
 *
 * @description
 * - 順序付きの頂点列で多角形を表現する
 * - 初期状態は正方形だが、折るたびに任意の多角形になる
 */
export type Board = THREE.Vector3[];

/**
 * 折り線（折り紙境界との交点で区切られた線分）
 */
export interface FoldLine {
  /** 折り線の始点 */
  start: THREE.Vector3;
  /** 折り線の終点 */
  end: THREE.Vector3;
}

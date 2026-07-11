import * as THREE from "three";

/**
 * 頂点を回転させる軸（回転軸が通る点と向き付きの方向）
 *
 * @description
 * - 折りアニメーションと投稿データ（答え形式）で共通の表現
 * - 頂点はこの軸の列を同一角度θで順に適用して動かす（0本なら不動）。
 *   軸上の点は回転で不動なので、軸上の頂点を特別扱いする必要はない
 */
export interface VertexAxis {
  /** 回転軸が通る点 */
  origin: THREE.Vector3;
  /** 回転軸の方向（正規化済み。正の回転角で持ち上がる向き） */
  direction: THREE.Vector3;
}

/**
 * 頂点に回転軸の列を同一角度で順に適用した新しい頂点を返す
 *
 * @param vertex - 回転対象の頂点
 * @param axes - 順に適用する回転軸（0本なら元の座標のまま）
 * @param angle - 回転角（ラジアン）
 */
export const applyVertexAxes = (
  vertex: THREE.Vector3,
  axes: VertexAxis[],
  angle: number
): THREE.Vector3 =>
  axes.reduce(
    (moved, axis) =>
      moved
        .sub(axis.origin)
        .applyAxisAngle(axis.direction, angle)
        .add(axis.origin),
    vertex.clone()
  );

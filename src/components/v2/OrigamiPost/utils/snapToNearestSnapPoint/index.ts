import * as THREE from "three";
import { SnapPoint } from "../collectSnapPoints";

/**
 * ドラッグ中の点がスナップポイントに吸着するXY平面上の距離の閾値
 *
 * 板の一辺（100）に対して視覚的に「近い」と感じる範囲で、
 * 隣接するスナップポイント同士を誤って掴まない程度の大きさにしている
 */
export const SNAP_ATTRACTION_RADIUS = 8;

/**
 * 位置に最も近いスナップポイントへ吸着させた座標を返す
 *
 * @param position - ドラッグ中の点の位置（XY平面上）
 * @param snapPoints - 吸着先の候補となるスナップポイント
 * @returns 吸着半径内に最も近いスナップポイントがあればその座標のコピー、
 *   なければ入力のpositionをそのまま返す
 *
 * @description
 * - 頂点から頂点へ動かして折る操作が大半のため、近接した頂点へ正確に
 *   重なるよう吸着させることで、綺麗に折れる折り線を作りやすくする
 * - 距離はXY平面上で判定する（スナップポイントはz=0に集約済み）
 * - 複数が半径内にある場合は最も近いものへ吸着する
 */
export const snapToNearestSnapPoint = (
  position: THREE.Vector3,
  snapPoints: SnapPoint[]
): THREE.Vector3 => {
  let nearest: SnapPoint | null = null;
  let nearestDistance = SNAP_ATTRACTION_RADIUS;

  for (const snapPoint of snapPoints) {
    const distance = Math.hypot(
      snapPoint.position.x - position.x,
      snapPoint.position.y - position.y
    );
    if (distance <= nearestDistance) {
      nearest = snapPoint;
      nearestDistance = distance;
    }
  }

  return nearest ? nearest.position.clone() : position;
};

import * as THREE from "three";

/**
 * ドラッグ中の点がスナップ先に吸着するXY平面上の距離の閾値
 *
 * 板の一辺（100）に対して視覚的に「近い」と感じる範囲で、
 * 隣接するスナップポイント同士を誤って掴まない程度の大きさにしている
 */
export const SNAP_ATTRACTION_RADIUS = 8;

/**
 * 位置に最も近いスナップ先へ吸着させた座標を返す
 *
 * @param position - ドラッグ中の点の位置（XY平面上）
 * @param snapTargets - 吸着先の候補となる座標（頂点のスナップポイントと
 *   辺の折り込み先=アライメント候補を合わせたもの）
 * @returns 吸着半径内に最も近い候補があればその座標のコピー、
 *   なければ入力のpositionをそのまま返す
 *
 * @description
 * - 頂点から頂点へ動かして折る操作が大半のため、近接した候補へ正確に
 *   重なるよう吸着させることで、綺麗に折れる折り線を作りやすくする
 * - 距離はXY平面上で判定する（候補はz=0に集約済み）
 * - 複数が半径内にある場合は最も近いものへ吸着する
 */
export const snapToNearestSnapPoint = (
  position: THREE.Vector3,
  snapTargets: THREE.Vector3[]
): THREE.Vector3 => {
  let nearest: THREE.Vector3 | null = null;
  let nearestDistance = SNAP_ATTRACTION_RADIUS;

  for (const target of snapTargets) {
    const distance = Math.hypot(target.x - position.x, target.y - position.y);
    if (distance <= nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  }

  return nearest ? nearest.clone() : position;
};

import * as THREE from "three";
import { Board, FoldLine } from "../../types";

/**
 * 折り回転の軸ベクトルを決定する
 *
 * @param foldLine - 折り線
 * @param movingBoard - 折りで動く板
 * @returns 正の回転角で動く板が+Z側（カメラ側）へ持ち上がる向きの
 *          正規化済み軸ベクトル。決定できない場合（動く板の全頂点が
 *          折り線上にある等）はnull
 *
 * @description
 * - 回転軸の向きによって、同じ正の回転角でも板が+Z側/-Z側のどちらへ
 *   持ち上がるかが変わる（右ねじの法則）
 * - 動く板の代表点（折り線から最も離れた頂点）について、微小回転での
 *   移動方向 axis × r のz成分が正になる向きを選ぶ
 * - これにより呼び出し側は常に「0→180度の正の角度」で回転させればよい
 */
export const determineFoldRotation = (
  foldLine: FoldLine,
  movingBoard: Board
): THREE.Vector3 | null => {
  const axisDirection = new THREE.Vector3()
    .subVectors(foldLine.end, foldLine.start)
    .normalize();

  if (axisDirection.lengthSq() < 1e-12) return null;

  // 折り線から最も離れた頂点を代表点として、+Z側へ持ち上がる向きを判定する
  // crossZ = (axis × r).z が最大の頂点を使う（rは折り線始点から頂点へのベクトル）
  let maxAbsLift = 0;
  let liftAtFarthestVertex = 0;

  for (const vertex of movingBoard) {
    const relative = new THREE.Vector3().subVectors(vertex, foldLine.start);
    const lift = new THREE.Vector3().crossVectors(axisDirection, relative).z;

    if (Math.abs(lift) > maxAbsLift) {
      maxAbsLift = Math.abs(lift);
      liftAtFarthestVertex = lift;
    }
  }

  // すべての頂点が折り線上にある（退化した板）
  if (maxAbsLift < 1e-6) return null;

  return liftAtFarthestVertex > 0 ? axisDirection : axisDirection.negate();
};

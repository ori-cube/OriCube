import * as THREE from "three";
import { Board, FoldLine } from "../../types";
import { SquashPiece } from "../applySquashFoldStep";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import { distanceToFoldLine } from "../applyFoldStep";

/**
 * 開いて畳むアニメーションの途中経過の頂点座標を計算する
 *
 * @param props.movingPieces - 動く3片（applySquashFoldStepの出力）
 * @param props.foldLine - 折り線
 * @param props.hinge - ヒンジ（奥フラップと固定側の折り目）
 * @param props.spine - スパイン（フラップ2枚の折り目。start=折り線側の端点A）
 * @param props.foldLineAxis - 折り線の向き付き回転軸（determineFoldRotationの出力）
 * @param props.hingeAxis - ヒンジの向き付き回転軸
 * @param props.angle - 回転角（0で開始位置、πで確定位置）
 * @returns movingPiecesと同じ順序の、回転後の頂点座標
 *
 * @description
 * 閲覧機能のconvolutionステップと同じく、頂点ごとに自分の回転軸周りへ
 * 同一角度で回転させる方式。片は途中経過では厳密な剛体ではないが、
 * 隣り合う片と共有する辺（スパイン・カット辺・ヒンジ）の頂点は同じ
 * 動きに分類されるため、見た目上つながったまま開いて畳まれる。
 *
 * 頂点の分類（順に判定）:
 * - mirrorFoldLineの片: 折り線上は不動、それ以外は折り線周りに回転
 * - mirrorHingeの片: ヒンジ上は不動、それ以外はヒンジ周りに回転
 * - openRotateの片: ヒンジ上は不動、折り線上はヒンジ周り、スパイン上は
 *   折り線周り（mirrorFoldLineの片と接着を保つ）、それ以外は
 *   折り線周り→ヒンジ周りの合成回転
 */
export const computeSquashAnimationPositions = (props: {
  movingPieces: SquashPiece[];
  foldLine: FoldLine;
  hinge: FoldLine;
  spine: FoldLine;
  foldLineAxis: THREE.Vector3;
  hingeAxis: THREE.Vector3;
  angle: number;
}): Board[] => {
  const { movingPieces, foldLine, hinge, spine, foldLineAxis, hingeAxis, angle } =
    props;

  const rotateAroundFoldLine = (vertex: THREE.Vector3): THREE.Vector3 =>
    rotateVertex(vertex, foldLine.start, foldLineAxis, angle);
  const rotateAroundHinge = (vertex: THREE.Vector3): THREE.Vector3 =>
    rotateVertex(vertex, hinge.start, hingeAxis, angle);

  const isOnFoldLine = (vertex: THREE.Vector3): boolean =>
    distanceToFoldLine(vertex, foldLine) <= SNAP_MERGE_TOLERANCE;
  const isOnHinge = (vertex: THREE.Vector3): boolean =>
    distanceToFoldLine(vertex, hinge) <= SNAP_MERGE_TOLERANCE;
  const isOnSpine = (vertex: THREE.Vector3): boolean =>
    distanceToSegment(vertex, spine.start, spine.end) <= SNAP_MERGE_TOLERANCE;

  const moveVertex = (
    vertex: THREE.Vector3,
    motion: SquashPiece["motion"]
  ): THREE.Vector3 => {
    switch (motion) {
      case "mirrorFoldLine":
        return isOnFoldLine(vertex) ? vertex.clone() : rotateAroundFoldLine(vertex);
      case "mirrorHinge":
        return isOnHinge(vertex) ? vertex.clone() : rotateAroundHinge(vertex);
      case "openRotate":
        if (isOnHinge(vertex)) return vertex.clone();
        if (isOnFoldLine(vertex)) return rotateAroundHinge(vertex);
        if (isOnSpine(vertex)) return rotateAroundFoldLine(vertex);
        return rotateAroundHinge(rotateAroundFoldLine(vertex));
    }
  };

  return movingPieces.map((moving) =>
    moving.piece.polygon.map((vertex) => moveVertex(vertex, moving.motion))
  );
};

/**
 * 頂点を任意の軸周りに回転させた新しい頂点を返す
 */
const rotateVertex = (
  vertex: THREE.Vector3,
  axisPoint: THREE.Vector3,
  axisDirection: THREE.Vector3,
  angle: number
): THREE.Vector3 =>
  vertex
    .clone()
    .sub(axisPoint)
    .applyAxisAngle(axisDirection, angle)
    .add(axisPoint);

/**
 * XY平面上の点と線分の距離を計算する
 */
export const distanceToSegment = (
  point: THREE.Vector3,
  segmentStart: THREE.Vector3,
  segmentEnd: THREE.Vector3
): number => {
  const direction = new THREE.Vector3().subVectors(segmentEnd, segmentStart);
  const lengthSquared = direction.lengthSq();
  if (lengthSquared < 1e-12) return point.distanceTo(segmentStart);

  const t = THREE.MathUtils.clamp(
    new THREE.Vector3().subVectors(point, segmentStart).dot(direction) /
      lengthSquared,
    0,
    1
  );
  const closest = new THREE.Vector3().lerpVectors(segmentStart, segmentEnd, t);
  return point.distanceTo(closest);
};

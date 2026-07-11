import * as THREE from "three";
import { Board, FoldLine } from "../../types";
import { PetalPiece } from "../applyPetalFoldStep";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import { distanceToFoldLine } from "../applyFoldStep";
import { distanceToSegment } from "../computeSquashAnimationPositions";

/**
 * 花弁折りアニメーションの途中経過の頂点座標を計算する
 *
 * @param props.movingPieces - 動く6片（applyPetalFoldStepの出力）
 * @param props.foldLine - 正準化された折り線
 * @param props.kiteLines - 左右のかぶせ折り線（sideIndexに対応）
 * @param props.tuckCreases - 左右の畳み込み折り目（サイド片と耳片の共有辺）
 * @param props.foldLineAxis - 折り線の向き付き回転軸（determineFoldRotationの出力）
 * @param props.kiteAxes - 左右のかぶせ折り線の向き付き回転軸
 * @param props.angle - 回転角（0で開始位置、πで確定位置）
 * @returns movingPiecesと同じ順序の、回転後の頂点座標
 *
 * @description
 * 開いて畳むと同じく、頂点ごとに自分の回転軸周りへ同一角度で回転させる
 * 方式。片は途中経過では厳密な剛体ではないが、隣り合う片と共有する辺
 * （かぶせ折り線・畳み込み折り目・折り線・スパイン）の頂点は同じ動きに
 * 分類されるため、見た目上つながったまま畳まれる。
 *
 * 頂点の分類（順に判定）:
 * - mirrorFoldLineの片（中央片）: 折り線上は不動、それ以外は折り線周りに回転
 * - mirrorKiteの片（耳片）: かぶせ折り線上は不動、それ以外はかぶせ折り線
 *   周りに回転
 * - kiteThenFoldLineの片（サイド片）: 折り線上は不動、かぶせ折り線上は
 *   折り線周り（中央片と接着を保つ）、畳み込み折り目上はかぶせ折り線周り
 *   （耳片と接着を保つ）、それ以外はかぶせ折り線→折り線の合成回転
 */
export const computePetalAnimationPositions = (props: {
  movingPieces: PetalPiece[];
  foldLine: FoldLine;
  kiteLines: [FoldLine, FoldLine];
  tuckCreases: [FoldLine, FoldLine];
  foldLineAxis: THREE.Vector3;
  kiteAxes: [THREE.Vector3, THREE.Vector3];
  angle: number;
}): Board[] => {
  const {
    movingPieces,
    foldLine,
    kiteLines,
    tuckCreases,
    foldLineAxis,
    kiteAxes,
    angle,
  } = props;

  const rotateAroundFoldLine = (vertex: THREE.Vector3): THREE.Vector3 =>
    rotateVertex(vertex, foldLine.start, foldLineAxis, angle);
  const rotateAroundKite = (
    vertex: THREE.Vector3,
    sideIndex: 0 | 1
  ): THREE.Vector3 =>
    rotateVertex(vertex, kiteLines[sideIndex].start, kiteAxes[sideIndex], angle);

  const isOnFoldLine = (vertex: THREE.Vector3): boolean =>
    distanceToFoldLine(vertex, foldLine) <= SNAP_MERGE_TOLERANCE;
  const isOnKiteLine = (vertex: THREE.Vector3, sideIndex: 0 | 1): boolean =>
    distanceToFoldLine(vertex, kiteLines[sideIndex]) <= SNAP_MERGE_TOLERANCE;
  const isOnTuckCrease = (vertex: THREE.Vector3, sideIndex: 0 | 1): boolean =>
    distanceToSegment(
      vertex,
      tuckCreases[sideIndex].start,
      tuckCreases[sideIndex].end
    ) <= SNAP_MERGE_TOLERANCE;

  const moveVertex = (
    vertex: THREE.Vector3,
    motion: PetalPiece["motion"],
    sideIndex: 0 | 1
  ): THREE.Vector3 => {
    switch (motion) {
      case "mirrorFoldLine":
        return isOnFoldLine(vertex)
          ? vertex.clone()
          : rotateAroundFoldLine(vertex);
      case "mirrorKite":
        return isOnKiteLine(vertex, sideIndex)
          ? vertex.clone()
          : rotateAroundKite(vertex, sideIndex);
      case "kiteThenFoldLine":
        if (isOnFoldLine(vertex)) return vertex.clone();
        if (isOnKiteLine(vertex, sideIndex)) return rotateAroundFoldLine(vertex);
        if (isOnTuckCrease(vertex, sideIndex)) {
          return rotateAroundKite(vertex, sideIndex);
        }
        return rotateAroundFoldLine(rotateAroundKite(vertex, sideIndex));
    }
  };

  return movingPieces.map((moving) =>
    moving.piece.polygon.map((vertex) =>
      moveVertex(vertex, moving.motion, moving.sideIndex)
    )
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

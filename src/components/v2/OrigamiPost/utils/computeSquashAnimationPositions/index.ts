import * as THREE from "three";
import { Board, FoldLine, SquashFoldStep } from "../../types";
import { SquashFoldStepResult, SquashPiece } from "../applySquashFoldStep";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import { distanceToFoldLine } from "../applyFoldStep";
import { determineFoldRotation } from "../determineFoldRotation";
import { VertexAxis, applyVertexAxes } from "../vertexAxes";

/**
 * 開いて畳むの回転軸（折り線とヒンジ）を導出する
 *
 * @param step - 開いて畳む操作
 * @param result - 適用結果
 * @returns 向き付きの回転軸。構成できない場合はnull
 *
 * @description
 * 動く片は折ったときの視点側（表なら+Z、裏なら-Z）へ持ち上がる向きに
 * 軸を選ぶ。アニメーションと投稿データ化の両方で同じ軸を使う
 */
export const deriveSquashRotationAxes = (
  step: SquashFoldStep,
  result: SquashFoldStepResult
): { foldLineAxis: THREE.Vector3; hingeAxis: THREE.Vector3 } | null => {
  const mirrorFoldLinePiece = result.movingPieces.find(
    (moving) => moving.motion === "mirrorFoldLine"
  );
  const mirrorHingePiece = result.movingPieces.find(
    (moving) => moving.motion === "mirrorHinge"
  );
  if (!mirrorFoldLinePiece || !mirrorHingePiece) return null;

  const liftDirection = new THREE.Vector3(0, 0, step.viewFront ? 1 : -1);
  const foldLineAxis = determineFoldRotation(
    step.foldLine,
    mirrorFoldLinePiece.piece.polygon,
    liftDirection
  );
  const hingeAxis = determineFoldRotation(
    result.hinge,
    mirrorHingePiece.piece.polygon,
    liftDirection
  );
  if (!foldLineAxis || !hingeAxis) return null;

  return { foldLineAxis, hingeAxis };
};

/**
 * 開いて畳むで動く片の、頂点ごとの回転軸の列を収集する
 *
 * @param props.movingPieces - 動く3片（applySquashFoldStepの出力）
 * @param props.foldLine - 折り線
 * @param props.hinge - ヒンジ（奥フラップと固定側の折り目）
 * @param props.spine - スパイン（フラップ2枚の折り目。start=折り線側の端点A）
 * @param props.foldLineAxis - 折り線の向き付き回転軸
 * @param props.hingeAxis - ヒンジの向き付き回転軸
 * @returns movingPiecesと同じ順序の、片ごと・頂点ごとの回転軸の列
 *
 * @description
 * 全頂点が同一角度θで自分の軸の列を順に適用して動く。片は途中経過では
 * 厳密な剛体ではないが、隣り合う片と共有する辺（スパイン・カット辺・
 * ヒンジ）の頂点は同じ軸の列に分類されるため、見た目上つながったまま
 * 開いて畳まれる。
 *
 * 頂点の分類（順に判定。軸上の頂点は回転で不動なので、不動の特別扱いは
 * 合成回転の打ち切りだけに必要）:
 * - mirrorFoldLineの片: 折り線周りに回転
 * - mirrorHingeの片: ヒンジ周りに回転
 * - openRotateの片: ヒンジ上→不動、折り線上→ヒンジ周り、スパイン上→
 *   折り線周り（mirrorFoldLineの片と接着を保つ）、その他→折り線→ヒンジの
 *   合成回転
 */
export const collectSquashVertexAxes = (props: {
  movingPieces: SquashPiece[];
  foldLine: FoldLine;
  hinge: FoldLine;
  spine: FoldLine;
  foldLineAxis: THREE.Vector3;
  hingeAxis: THREE.Vector3;
}): VertexAxis[][][] => {
  const { movingPieces, foldLine, hinge, spine, foldLineAxis, hingeAxis } =
    props;

  const foldLineRotation: VertexAxis = {
    origin: foldLine.start,
    direction: foldLineAxis,
  };
  const hingeRotation: VertexAxis = {
    origin: hinge.start,
    direction: hingeAxis,
  };

  const isOnFoldLine = (vertex: THREE.Vector3): boolean =>
    distanceToFoldLine(vertex, foldLine) <= SNAP_MERGE_TOLERANCE;
  const isOnHinge = (vertex: THREE.Vector3): boolean =>
    distanceToFoldLine(vertex, hinge) <= SNAP_MERGE_TOLERANCE;
  const isOnSpine = (vertex: THREE.Vector3): boolean =>
    distanceToSegment(vertex, spine.start, spine.end) <= SNAP_MERGE_TOLERANCE;

  const axesOfVertex = (
    vertex: THREE.Vector3,
    motion: SquashPiece["motion"]
  ): VertexAxis[] => {
    switch (motion) {
      case "mirrorFoldLine":
        return [foldLineRotation];
      case "mirrorHinge":
        return [hingeRotation];
      case "openRotate":
        if (isOnHinge(vertex)) return [];
        if (isOnFoldLine(vertex)) return [hingeRotation];
        if (isOnSpine(vertex)) return [foldLineRotation];
        return [foldLineRotation, hingeRotation];
    }
  };

  return movingPieces.map((moving) =>
    moving.piece.polygon.map((vertex) => axesOfVertex(vertex, moving.motion))
  );
};

/**
 * 開いて畳むアニメーションの途中経過の頂点座標を計算する
 *
 * @param props.angle - 回転角（0で開始位置、πで確定位置）
 * @returns movingPiecesと同じ順序の、回転後の頂点座標
 *
 * @description
 * collectSquashVertexAxesで分類した頂点ごとの回転軸の列を、
 * 同一角度θで順に適用する（閲覧機能のconvolutionステップと同じ方式）
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
  const { angle, ...axesProps } = props;
  const vertexAxes = collectSquashVertexAxes(axesProps);

  return props.movingPieces.map((moving, pieceIndex) =>
    moving.piece.polygon.map((vertex, vertexIndex) =>
      applyVertexAxes(vertex, vertexAxes[pieceIndex][vertexIndex], angle)
    )
  );
};

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

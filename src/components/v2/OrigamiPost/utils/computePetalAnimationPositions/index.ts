import * as THREE from "three";
import { Board, FoldLine, PetalFoldStep } from "../../types";
import { PetalFoldStepResult, PetalPiece } from "../applyPetalFoldStep";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";
import { distanceToFoldLine } from "../applyFoldStep";
import { determineFoldRotation } from "../determineFoldRotation";
import { distanceToSegment } from "../computeSquashAnimationPositions";
import { VertexAxis, applyVertexAxes } from "../vertexAxes";

/**
 * 花弁折りの回転軸（折り線と左右のかぶせ折り線）を導出する
 *
 * @param step - 花弁折り操作
 * @param result - 適用結果
 * @returns 向き付きの回転軸。構成できない場合はnull
 *
 * @description
 * 動く片は折ったときの視点側（表なら+Z、裏なら-Z）へ持ち上がる向きに
 * 軸を選ぶ（折り線は中央片、かぶせ折り線は左右の耳片で判定）。
 * アニメーションと投稿データ化の両方で同じ軸を使う
 */
export const derivePetalRotationAxes = (
  step: PetalFoldStep,
  result: PetalFoldStepResult
): {
  foldLineAxis: THREE.Vector3;
  kiteAxes: [THREE.Vector3, THREE.Vector3];
} | null => {
  const liftDirection = new THREE.Vector3(0, 0, step.viewFront ? 1 : -1);

  const centralPiece = result.movingPieces.find(
    (moving) => moving.motion === "mirrorFoldLine"
  );
  if (!centralPiece) return null;
  const foldLineAxis = determineFoldRotation(
    result.foldLine,
    centralPiece.piece.polygon,
    liftDirection
  );

  const kiteAxisFor = (sideIndex: 0 | 1): THREE.Vector3 | null => {
    const earPiece = result.movingPieces.find(
      (moving) =>
        moving.motion === "mirrorKite" && moving.sideIndex === sideIndex
    );
    if (!earPiece) return null;
    return determineFoldRotation(
      result.kiteLines[sideIndex],
      earPiece.piece.polygon,
      liftDirection
    );
  };
  const firstKiteAxis = kiteAxisFor(0);
  const secondKiteAxis = kiteAxisFor(1);
  if (!foldLineAxis || !firstKiteAxis || !secondKiteAxis) return null;

  return { foldLineAxis, kiteAxes: [firstKiteAxis, secondKiteAxis] };
};

/**
 * 花弁折りで動く片の、頂点ごとの回転軸の列を収集する
 *
 * @param props.movingPieces - 動く6片（applyPetalFoldStepの出力）
 * @param props.foldLine - 正準化された折り線
 * @param props.kiteLines - 左右のかぶせ折り線（sideIndexに対応）
 * @param props.tuckCreases - 左右の畳み込み折り目（サイド片と耳片の共有辺）
 * @param props.foldLineAxis - 折り線の向き付き回転軸
 * @param props.kiteAxes - 左右のかぶせ折り線の向き付き回転軸
 * @returns movingPiecesと同じ順序の、片ごと・頂点ごとの回転軸の列
 *
 * @description
 * 開いて畳むと同じく、全頂点が同一角度θで自分の軸の列を順に適用して動く。
 * 片は途中経過では厳密な剛体ではないが、隣り合う片と共有する辺
 * （かぶせ折り線・畳み込み折り目・折り線・スパイン）の頂点は同じ軸の列に
 * 分類されるため、見た目上つながったまま畳まれる。
 *
 * 頂点の分類（順に判定。軸上の頂点は回転で不動なので、不動の特別扱いは
 * 合成回転の打ち切りだけに必要）:
 * - mirrorFoldLineの片（中央片）: 折り線周りに回転
 * - mirrorKiteの片（耳片）: かぶせ折り線周りに回転
 * - kiteThenFoldLineの片（サイド片）: 折り線上→不動、かぶせ折り線上→
 *   折り線周り（中央片と接着を保つ）、畳み込み折り目上→かぶせ折り線周り
 *   （耳片と接着を保つ）、その他→かぶせ折り線→折り線の合成回転
 */
export const collectPetalVertexAxes = (props: {
  movingPieces: PetalPiece[];
  foldLine: FoldLine;
  kiteLines: [FoldLine, FoldLine];
  tuckCreases: [FoldLine, FoldLine];
  foldLineAxis: THREE.Vector3;
  kiteAxes: [THREE.Vector3, THREE.Vector3];
}): VertexAxis[][][] => {
  const {
    movingPieces,
    foldLine,
    kiteLines,
    tuckCreases,
    foldLineAxis,
    kiteAxes,
  } = props;

  const foldLineRotation: VertexAxis = {
    origin: foldLine.start,
    direction: foldLineAxis,
  };
  const kiteRotations: [VertexAxis, VertexAxis] = [
    { origin: kiteLines[0].start, direction: kiteAxes[0] },
    { origin: kiteLines[1].start, direction: kiteAxes[1] },
  ];

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

  const axesOfVertex = (
    vertex: THREE.Vector3,
    motion: PetalPiece["motion"],
    sideIndex: 0 | 1
  ): VertexAxis[] => {
    switch (motion) {
      case "mirrorFoldLine":
        return [foldLineRotation];
      case "mirrorKite":
        return [kiteRotations[sideIndex]];
      case "kiteThenFoldLine":
        if (isOnFoldLine(vertex)) return [];
        if (isOnKiteLine(vertex, sideIndex)) return [foldLineRotation];
        if (isOnTuckCrease(vertex, sideIndex)) {
          return [kiteRotations[sideIndex]];
        }
        return [kiteRotations[sideIndex], foldLineRotation];
    }
  };

  return movingPieces.map((moving) =>
    moving.piece.polygon.map((vertex) =>
      axesOfVertex(vertex, moving.motion, moving.sideIndex)
    )
  );
};

/**
 * 花弁折りアニメーションの途中経過の頂点座標を計算する
 *
 * @param props.angle - 回転角（0で開始位置、πで確定位置）
 * @returns movingPiecesと同じ順序の、回転後の頂点座標
 *
 * @description
 * collectPetalVertexAxesで分類した頂点ごとの回転軸の列を、
 * 同一角度θで順に適用する（開いて畳むと同じ方式）
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
  const { angle, ...axesProps } = props;
  const vertexAxes = collectPetalVertexAxes(axesProps);

  return props.movingPieces.map((moving, pieceIndex) =>
    moving.piece.polygon.map((vertex, vertexIndex) =>
      applyVertexAxes(vertex, vertexAxes[pieceIndex][vertexIndex], angle)
    )
  );
};

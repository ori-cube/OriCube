import * as THREE from "three";
import { LayeredBoard } from "../../types";
import { SNAP_MERGE_TOLERANCE } from "../collectSnapPoints";

/**
 * ドラッグ中の頂点に対する「辺の折り込み先」（アライメント候補）を列挙する
 *
 * @param boards - 現在の板の一覧
 * @param dragVertex - ドラッグしている頂点の元位置
 * @returns 吸着候補の座標一覧（XY平面上、z=0。重複は集約済み）
 *
 * @description
 * - 「辺を別の辺（折り目）に沿わせて折る」操作の畳み先を正確に狙える
 *   ようにする。畳み先は既存の頂点と一致しない無理数座標になることが
 *   多く（例: 鶴の基本形で足を細くする折り）、頂点への吸着だけでは
 *   ドロップ精度が足りず折りが不成立になるため
 * - 計算方法: dragVertex Dと辺でつながる各頂点Wについて、Wから出る
 *   他の辺の方向へ |D-W| 進んだ点 W + |D-W|・unit(方向) を候補にする
 *   （辺 D-W をその辺に沿わせて畳んだときのDの畳み先）
 * - Dの位置そのものと一致する候補は除外する（辺を自分自身に沿わせる
 *   無意味な折り。頂点への吸着候補としては既にDが存在する）
 * - 板をまたいで同一位置の頂点・同一方向の辺は集約する
 */
export const collectAlignmentSnapPoints = (
  boards: LayeredBoard[],
  dragVertex: THREE.Vector3
): THREE.Vector3[] => {
  // dragVertexと辺でつながる頂点（W）を全板から集める
  const hingeVertices = collectUniquePoints(
    boards.flatMap((board) =>
      collectEdgesAt(board, dragVertex).map((edge) => edge.other)
    )
  );

  const targets: THREE.Vector3[] = [];
  for (const hingeVertex of hingeVertices) {
    const armLength = Math.hypot(
      dragVertex.x - hingeVertex.x,
      dragVertex.y - hingeVertex.y
    );
    if (armLength < SNAP_MERGE_TOLERANCE) continue;

    // Wから出る全ての辺の方向へ、腕の長さぶん進んだ点が畳み先
    for (const board of boards) {
      for (const edge of collectEdgesAt(board, hingeVertex)) {
        const directionLength = Math.hypot(
          edge.other.x - hingeVertex.x,
          edge.other.y - hingeVertex.y
        );
        if (directionLength < SNAP_MERGE_TOLERANCE) continue;

        const target = new THREE.Vector3(
          hingeVertex.x +
            ((edge.other.x - hingeVertex.x) / directionLength) * armLength,
          hingeVertex.y +
            ((edge.other.y - hingeVertex.y) / directionLength) * armLength,
          0
        );

        // Dの位置と一致する候補（辺を自分自身に沿わせる折り）は除外
        if (isSamePosition(target, dragVertex)) continue;

        targets.push(target);
      }
    }
  }

  return collectUniquePoints(targets);
};

/**
 * 板の境界辺のうち、一端が指定位置に一致する辺の「反対側の端点」を集める
 */
const collectEdgesAt = (
  board: LayeredBoard,
  position: THREE.Vector3
): { other: THREE.Vector3 }[] => {
  const edges: { other: THREE.Vector3 }[] = [];
  const polygon = board.polygon;

  for (let i = 0; i < polygon.length; i++) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];

    if (isSamePosition(start, position)) edges.push({ other: end });
    else if (isSamePosition(end, position)) edges.push({ other: start });
  }

  return edges;
};

/**
 * 同一位置（スナップ集約の許容誤差内）の点を1つに集約する
 */
const collectUniquePoints = (points: THREE.Vector3[]): THREE.Vector3[] => {
  const unique: THREE.Vector3[] = [];
  for (const point of points) {
    if (!unique.some((existing) => isSamePosition(existing, point))) {
      unique.push(new THREE.Vector3(point.x, point.y, 0));
    }
  }
  return unique;
};

/**
 * 2点がXY平面上で同一位置（スナップ集約の許容誤差内）にあるか
 */
const isSamePosition = (a: THREE.Vector3, b: THREE.Vector3): boolean =>
  Math.abs(a.x - b.x) < SNAP_MERGE_TOLERANCE &&
  Math.abs(a.y - b.y) < SNAP_MERGE_TOLERANCE;

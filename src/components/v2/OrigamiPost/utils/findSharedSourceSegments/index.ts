import * as THREE from "three";
import { Board, BoardPiece } from "../../types";

/**
 * 同一の境界線分とみなす展開図空間での距離の許容誤差
 *
 * 展開図座標は分割時の補間のみで生成され、回転・鏡映による誤差が
 * 蓄積しないため小さくてよい
 */
const EPSILON = 1e-4;

/**
 * 2つの板が展開図上で共有する境界線分
 */
export interface SharedSegment {
  /** 線分の始点（展開図空間） */
  start: THREE.Vector3;
  /** 線分の終点（展開図空間） */
  end: THREE.Vector3;
}

/**
 * 2つの展開図ポリゴンが共有する境界線分（折り目）を検出する
 *
 * @param sourceA - 一方の板の展開図ポリゴン
 * @param sourceB - もう一方の板の展開図ポリゴン
 * @returns 共有する境界線分の一覧（重なりがなければ空配列）
 *
 * @description
 * - 紙は展開図上では連続体なので、2つの板が正の長さの境界線分を
 *   共有していれば物理的につながっている（折り目がある）と判定できる
 * - 境界辺のペアごとに、共線かつ正の長さで重なる区間を返す（辺の向きは
 *   問わない）。点接触（長さ0）は共有とみなさない
 */
export const findSharedSourceSegments = (
  sourceA: Board,
  sourceB: Board
): SharedSegment[] => {
  const segments: SharedSegment[] = [];

  for (let i = 0; i < sourceA.length; i++) {
    const edgeStart = sourceA[i];
    const edgeEnd = sourceA[(i + 1) % sourceA.length];

    for (let j = 0; j < sourceB.length; j++) {
      const overlap = calculateCollinearOverlap(
        edgeStart,
        edgeEnd,
        sourceB[j],
        sourceB[(j + 1) % sourceB.length]
      );
      if (overlap) segments.push(overlap);
    }
  }

  return segments;
};

/**
 * 展開図境界上の点を、対応する折り畳み空間の座標へ写像する
 *
 * @param piece - 写像に使う片（polygonとsourcePolygonの頂点対応を利用）
 * @param sourcePoint - 展開図空間の点（pieceの境界上にあること）
 * @returns 折り畳み空間の座標。境界上に見つからない場合はnull
 *
 * @description
 * sourcePointを含むsourcePolygonの辺を探し、辺上のパラメータtで
 * polygonの対応辺をlerpして折り畳み空間の座標を求める
 */
export const mapSourceBoundaryPointToFolded = (
  piece: BoardPiece,
  sourcePoint: THREE.Vector3
): THREE.Vector3 | null => {
  const { polygon, sourcePolygon } = piece;

  for (let i = 0; i < sourcePolygon.length; i++) {
    const edgeStart = sourcePolygon[i];
    const edgeEnd = sourcePolygon[(i + 1) % sourcePolygon.length];

    const t = projectParameterOnEdge(edgeStart, edgeEnd, sourcePoint);
    if (t === null) continue;

    const closest = new THREE.Vector3().lerpVectors(edgeStart, edgeEnd, t);
    if (closest.distanceTo(sourcePoint) >= EPSILON) continue;

    return new THREE.Vector3().lerpVectors(
      polygon[i],
      polygon[(i + 1) % polygon.length],
      t
    );
  }

  return null;
};

/**
 * 2つの辺が共線かつ正の長さで重なる区間を計算する
 *
 * @returns 重なる区間。共線でない・重なりが点接触以下の場合はnull
 */
const calculateCollinearOverlap = (
  aStart: THREE.Vector3,
  aEnd: THREE.Vector3,
  bStart: THREE.Vector3,
  bEnd: THREE.Vector3
): SharedSegment | null => {
  const direction = new THREE.Vector3().subVectors(aEnd, aStart);
  const lengthSquared = direction.lengthSq();
  if (lengthSquared < EPSILON * EPSILON) return null;

  // 辺bの両端が辺aの直線上に乗っていなければ共線でない
  const length = Math.sqrt(lengthSquared);
  const distanceToLine = (point: THREE.Vector3): number => {
    const toPoint = new THREE.Vector3().subVectors(point, aStart);
    return Math.abs(direction.x * toPoint.y - direction.y * toPoint.x) / length;
  };
  if (distanceToLine(bStart) >= EPSILON || distanceToLine(bEnd) >= EPSILON) {
    return null;
  }

  // 辺a上のパラメータ軸に射影して重なり区間を求める
  const parameterOf = (point: THREE.Vector3): number =>
    new THREE.Vector3().subVectors(point, aStart).dot(direction) /
    lengthSquared;

  const tbStart = parameterOf(bStart);
  const tbEnd = parameterOf(bEnd);
  const overlapStart = Math.max(0, Math.min(tbStart, tbEnd));
  const overlapEnd = Math.min(1, Math.max(tbStart, tbEnd));

  // 重なりが点接触（長さEPSILON以下）の場合は共有とみなさない
  if ((overlapEnd - overlapStart) * length <= EPSILON) return null;

  return {
    start: new THREE.Vector3().lerpVectors(aStart, aEnd, overlapStart),
    end: new THREE.Vector3().lerpVectors(aStart, aEnd, overlapEnd),
  };
};

/**
 * 点を辺の直線上に射影したパラメータを返す（辺が退化している場合はnull）
 */
const projectParameterOnEdge = (
  edgeStart: THREE.Vector3,
  edgeEnd: THREE.Vector3,
  point: THREE.Vector3
): number | null => {
  const direction = new THREE.Vector3().subVectors(edgeEnd, edgeStart);
  const lengthSquared = direction.lengthSq();
  if (lengthSquared < EPSILON * EPSILON) return null;

  const t =
    new THREE.Vector3().subVectors(point, edgeStart).dot(direction) /
    lengthSquared;
  return Math.min(1, Math.max(0, t));
};

import * as THREE from "three";
import { Board, FoldLine } from "../../types";

/** 同一の交点とみなす距離の閾値 */
const EPSILON = 1e-6;

/**
 * 無限直線としての折り線が板群を横切る区間（スパン）を計算する
 *
 * @param midpoint - 折り線が通る点
 * @param direction - 折り線の方向ベクトル
 * @param boards - 対象の板群（折る対象の板のみを渡す）
 * @returns 折り線の表示・分割入力に使うスパン {start, end}。
 *          折り線が板群と2点以上で交わらない場合はnull
 *
 * @description
 * - 各板の辺と直線の交点、および直線上にある頂点を集め、
 *   直線方向のパラメータが最小・最大の2点をスパンとして返す
 * - 板群が複数の場合はすべての板を覆う1本の区間になる
 * - 正方形前提だった calculateFoldLineIntersections の一般化
 */
export const calculateFoldLineSpan = (
  midpoint: THREE.Vector3,
  direction: THREE.Vector3,
  boards: Board[]
): FoldLine | null => {
  if (direction.lengthSq() < EPSILON * EPSILON) return null;

  const pointsOnLine: THREE.Vector3[] = [];

  for (const board of boards) {
    for (let i = 0; i < board.length; i++) {
      const current = board[i];
      const next = board[(i + 1) % board.length];

      // 直線上にある頂点は交点として扱う（辺が直線と平行な場合の取りこぼし防止）
      if (distanceFromLine(current, midpoint, direction) < EPSILON) {
        pointsOnLine.push(new THREE.Vector3(current.x, current.y, 0));
      }

      const intersection = calculateLineSegmentIntersection(
        midpoint,
        direction,
        current,
        next
      );
      if (intersection) {
        pointsOnLine.push(intersection);
      }
    }
  }

  if (pointsOnLine.length < 2) return null;

  // 直線方向のパラメータtが最小・最大の点をスパンの両端にする
  const withParameter = pointsOnLine.map((point) => ({
    point,
    t: new THREE.Vector3().subVectors(point, midpoint).dot(direction),
  }));
  withParameter.sort((a, b) => a.t - b.t);

  const start = withParameter[0].point;
  const end = withParameter[withParameter.length - 1].point;

  // スパンが1点に退化している（直線が頂点にしか触れていない）
  if (start.distanceTo(end) < EPSILON) return null;

  return { start, end };
};

/**
 * XY平面上で点と直線の距離を計算する
 */
const distanceFromLine = (
  point: THREE.Vector3,
  linePoint: THREE.Vector3,
  lineDir: THREE.Vector3
): number => {
  const cross =
    lineDir.x * (point.y - linePoint.y) - lineDir.y * (point.x - linePoint.x);
  return Math.abs(cross) / Math.sqrt(lineDir.x ** 2 + lineDir.y ** 2);
};

/**
 * 直線と線分の交点を計算する（XY平面上）
 *
 * @returns 交点（線分上にない場合はnull）
 */
const calculateLineSegmentIntersection = (
  linePoint: THREE.Vector3,
  lineDir: THREE.Vector3,
  segStart: THREE.Vector3,
  segEnd: THREE.Vector3
): THREE.Vector3 | null => {
  const segDir = new THREE.Vector3().subVectors(segEnd, segStart);

  // 直線と線分が平行な場合（直線上の頂点は呼び出し側で拾う）
  const denominator = lineDir.x * segDir.y - lineDir.y * segDir.x;
  if (Math.abs(denominator) < 1e-10) return null;

  // 直線: P = linePoint + t * lineDir、線分: P = segStart + s * segDir (0 <= s <= 1)
  const vx = segStart.x - linePoint.x;
  const vy = segStart.y - linePoint.y;
  const s = (lineDir.y * vx - lineDir.x * vy) / denominator;

  if (s < 0 || s > 1) return null;

  return new THREE.Vector3(
    segStart.x + s * segDir.x,
    segStart.y + s * segDir.y,
    0
  );
};

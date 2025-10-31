import * as THREE from "three";

/**
 * 折り線と折り紙境界の交点情報
 */
export interface FoldLineIntersections {
  /** 折り線の始点（折り紙境界との交点1） */
  start: THREE.Vector3;
  /** 折り線の終点（折り紙境界との交点2） */
  end: THREE.Vector3;
}

/**
 * 折り線と折り紙境界の交点を計算する
 *
 * @param midpoint - 折り線が通る中点
 * @param direction - 折り線の方向ベクトル
 * @param size - 折り紙のサイズ（一辺の長さ）
 * @returns 折り線の始点・終点
 *
 * @throws 交点が2点未満の場合はエラー
 *
 * @example
 * const midpoint = new THREE.Vector3(0, 0, 0);
 * const direction = new THREE.Vector3(0, 1, 0); // Y軸方向
 * const size = 100;
 * const intersections = calculateFoldLineIntersections(midpoint, direction, size);
 * // intersections.start: (-50, 0, 0)
 * // intersections.end: (50, 0, 0)
 */
export const calculateFoldLineIntersections = (
  midpoint: THREE.Vector3,
  direction: THREE.Vector3,
  size: number
): FoldLineIntersections => {
  // 折り紙の半分のサイズ
  const halfSize = size / 2;

  // 折り紙の4つの頂点を定義（XZ平面上、Y=0）
  const vertices = [
    new THREE.Vector3(-halfSize, 0, -halfSize), // 左奥
    new THREE.Vector3(halfSize, 0, -halfSize), // 右奥
    new THREE.Vector3(halfSize, 0, halfSize), // 右手前
    new THREE.Vector3(-halfSize, 0, halfSize), // 左手前
  ];

  // 折り紙の4辺を定義（各辺は2つの頂点で構成）
  const edges = [
    [vertices[0], vertices[1]], // 下辺
    [vertices[1], vertices[2]], // 右辺
    [vertices[2], vertices[3]], // 上辺
    [vertices[3], vertices[0]], // 左辺
  ];

  // 各辺と折り線の交点を計算
  const intersections: THREE.Vector3[] = [];

  for (const [start, end] of edges) {
    const intersection = calculateLineSegmentIntersection(
      midpoint,
      direction,
      start,
      end
    );
    if (intersection) {
      intersections.push(intersection);
    }
  }

  // 重複する交点を除去（折り線が頂点を通る場合、同じ点が複数回見つかる）
  const uniqueIntersections = removeDuplicatePoints(intersections);

  // 交点がちょうど2点でない場合はエラー
  if (uniqueIntersections.length !== 2) {
    throw new Error(
      `Invalid fold line: found ${uniqueIntersections.length} unique intersections, expected exactly 2`
    );
  }

  return {
    start: uniqueIntersections[0],
    end: uniqueIntersections[1],
  };
};

/**
 * 重複する点を除去する
 *
 * @param points - 点の配列
 * @param epsilon - 同一とみなす距離の閾値
 * @returns 重複を除去した点の配列
 */
const removeDuplicatePoints = (
  points: THREE.Vector3[],
  epsilon: number = 1e-6
): THREE.Vector3[] => {
  const unique: THREE.Vector3[] = [];

  for (const point of points) {
    // 既存の点との距離をチェック
    const isDuplicate = unique.some(
      (existing) => point.distanceTo(existing) < epsilon
    );

    if (!isDuplicate) {
      unique.push(point);
    }
  }

  return unique;
};

/**
 * 直線と線分の交点を計算する
 *
 * @param linePoint - 直線が通る点
 * @param lineDir - 直線の方向ベクトル
 * @param segStart - 線分の始点
 * @param segEnd - 線分の終点
 * @returns 交点（線分上にない場合はnull）
 */
const calculateLineSegmentIntersection = (
  linePoint: THREE.Vector3,
  lineDir: THREE.Vector3,
  segStart: THREE.Vector3,
  segEnd: THREE.Vector3
): THREE.Vector3 | null => {
  // 線分の方向ベクトル
  const segDir = new THREE.Vector3().subVectors(segEnd, segStart);

  // XZ平面上での計算（Y=0として扱う）
  const dx = lineDir.x;
  const dz = lineDir.z;
  const sx = segDir.x;
  const sz = segDir.z;

  // 直線と線分が平行な場合
  const denominator = dx * sz - dz * sx;
  if (Math.abs(denominator) < 1e-10) {
    return null;
  }

  // パラメトリック方程式を解く
  // 直線: P = linePoint + t * lineDir
  // 線分: P = segStart + s * segDir (0 <= s <= 1)
  // これらが等しい: linePoint + t * lineDir = segStart + s * segDir
  // 移項: t * lineDir - s * segDir = segStart - linePoint
  const vx = segStart.x - linePoint.x;
  const vz = segStart.z - linePoint.z;

  // クラメルの公式で s を求める
  // [dx  -sx] [t]   [vx]
  // [dz  -sz] [s] = [vz]
  const s = (dz * vx - dx * vz) / denominator;

  // 線分上にない場合
  if (s < 0 || s > 1) {
    return null;
  }

  // 交点を計算（XZ平面上、Y=0）
  return new THREE.Vector3(segStart.x + s * sx, 0, segStart.z + s * sz);
};

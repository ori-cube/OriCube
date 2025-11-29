import * as THREE from "three";

/**
 * 板の分割結果
 */
export interface DividedPlane {
  /** 折る側の頂点配列（originalPointが含まれる方） */
  movingPart: THREE.Vector3[];
  /** 固定される側の頂点配列 */
  fixedPart: THREE.Vector3[];
}

/**
 * 折り線で折り紙を2つの板に分割する（XY平面）
 *
 * @param plane - 現在の折り紙の頂点配列
 * @param foldLineStart - 折り線の始点（calculateFoldLineIntersectionsで計算済み）
 * @param foldLineEnd - 折り線の終点（calculateFoldLineIntersectionsで計算済み）
 * @param originalPoint - ドラッグ開始時の点（どちらが折る側かを判定するため）
 * @returns 折る側と固定される側の頂点配列
 *
 * @throws originalPointが折り線上にある場合
 *
 * @remarks
 * - foldLineStart と foldLineEnd は既に折り紙の境界との交点として計算されていることを前提とする
 * - この関数は各頂点を左右に分類し、交点（start, end）を両方に追加して板を分割する
 * - XY平面（Z=0）上での処理を前提とする
 */
export const dividePlane = (
  plane: THREE.Vector3[],
  foldLineStart: THREE.Vector3,
  foldLineEnd: THREE.Vector3,
  originalPoint: THREE.Vector3
): DividedPlane => {
  // 折り線の方向ベクトル
  const foldDirection = new THREE.Vector3()
    .subVectors(foldLineEnd, foldLineStart)
    .normalize();

  // 1. 各頂点を左側と右側に分類
  const leftVertices: THREE.Vector3[] = [];
  const rightVertices: THREE.Vector3[] = [];

  for (const vertex of plane) {
    const side = getSide(vertex, foldLineStart, foldDirection);
    if (side > 0) {
      leftVertices.push(vertex);
    } else if (side < 0) {
      rightVertices.push(vertex);
    }
    // side === 0 の場合は折り線上にあるので、どちらにも追加しない
    // （foldLineStart, foldLineEnd が既に交点として渡されているため）
  }

  // 2. foldLineStart と foldLineEnd を両方の配列に追加。折り線と折り紙の辺の交点。
  const intersections = [foldLineStart, foldLineEnd];

  for (const intersection of intersections) {
    // 左側に追加（頂点と重複していなければ）
    const isDuplicateLeft = leftVertices.some(
      (v) => v.distanceTo(intersection) < 1e-6
    );
    if (!isDuplicateLeft) {
      leftVertices.push(intersection);
    }

    // 右側に追加（頂点と重複していなければ）
    const isDuplicateRight = rightVertices.some(
      (v) => v.distanceTo(intersection) < 1e-6
    );
    if (!isDuplicateRight) {
      rightVertices.push(intersection);
    }
    // 頂点と重複していた場合、1で追加されているので、ここでは追加しない。
  }

  // 3. originalPointがどちら側にあるか判定。どちらが折る側かを判定する。
  const originalSide = getSide(originalPoint, foldLineStart, foldDirection);

  // originalPointが折り線上にある場合はエラー。ユーザーに操作をやり直させる。
  if (Math.abs(originalSide) < 1e-6) {
    throw new Error(
      "originalPoint is on the fold line, cannot determine which side to move"
    );
  }

  // originalPointが含まれる方がmovingPart
  const movingPart = originalSide > 0 ? leftVertices : rightVertices;
  const fixedPart = originalSide > 0 ? rightVertices : leftVertices;

  return {
    movingPart,
    fixedPart,
  };
};

/**
 * 点が折り線の左側にあるか右側にあるかを判定（XY平面）
 *
 * @param point - 判定する点
 * @param linePoint - 折り線上の点
 * @param lineDirection - 折り線の方向ベクトル（正規化済み）
 * @returns 正: 左側, 負: 右側, 0: 折り線上
 */
const getSide = (
  point: THREE.Vector3,
  linePoint: THREE.Vector3,
  lineDirection: THREE.Vector3
): number => {
  // XY平面での外積のZ成分を計算
  // (point - linePoint) × lineDirection のZ成分
  const v = new THREE.Vector3().subVectors(point, linePoint);

  // 外積のZ成分: vx * dirY - vy * dirX
  const crossZ = v.x * lineDirection.y - v.y * lineDirection.x;

  return crossZ;
};

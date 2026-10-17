import * as THREE from "three";
import { LayeredBoard } from "../../types";

/** 同一の頂点とみなすXY平面上の距離の閾値 */
export const SNAP_MERGE_TOLERANCE = 0.1;

/**
 * 集約済みのスナップポイント
 */
export interface SnapPoint {
  /** 集約後の位置（XY平面上、z=0） */
  position: THREE.Vector3;
  /** この位置に頂点を持つ板の数（折る枚数の選択肢の上限になる） */
  boardCount: number;
}

/**
 * 全ての板の頂点を集約してスナップポイントの一覧を返す
 *
 * @param boards - 現在の板の一覧
 * @returns 位置ごとに集約されたスナップポイント
 *
 * @description
 * - 折りで頂点が重なると複数の板が同じ位置に頂点を持つため、
 *   SNAP_MERGE_TOLERANCE以内の頂点は1つのスナップポイントに集約する
 * - boardCountはその位置に頂点を持つ板の数。2以上の場合、
 *   ドラッグ&ドロップ後に折る枚数の選択が必要になる
 * - 位置は最初に見つかった頂点の座標を代表として使う（z=0に揃える）
 */
export const collectSnapPoints = (boards: LayeredBoard[]): SnapPoint[] => {
  const entries: { position: THREE.Vector3; boardIndices: Set<number> }[] = [];

  boards.forEach((board, boardIndex) => {
    for (const vertex of board.polygon) {
      const existing = entries.find(
        (entry) =>
          Math.abs(entry.position.x - vertex.x) < SNAP_MERGE_TOLERANCE &&
          Math.abs(entry.position.y - vertex.y) < SNAP_MERGE_TOLERANCE
      );

      if (existing) {
        existing.boardIndices.add(boardIndex);
      } else {
        entries.push({
          position: new THREE.Vector3(vertex.x, vertex.y, 0),
          boardIndices: new Set([boardIndex]),
        });
      }
    }
  });

  return entries.map((entry) => ({
    position: entry.position,
    boardCount: entry.boardIndices.size,
  }));
};

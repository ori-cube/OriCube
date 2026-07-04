import * as THREE from "three";
import { Board, FoldLine } from "../../types";
import { isPointLeftOfLine } from "../isPointLeftOfLine";

/**
 * 折り線で分割された2つの板
 */
export interface SeparatedBoards {
  /** 折り線の左側の板（有向折り線start→endに対して左） */
  leftBoard: Board;
  /** 折り線の右側の板 */
  rightBoard: Board;
}

/** 面積がこの値未満の板は退化しているとみなす */
const MIN_AREA = 1e-6;

/**
 * 板（多角形）を折り線で2つに分割する
 *
 * @param board - 分割対象の板（順序付き頂点列、XY平面上）
 * @param foldLine - 折り線（無限直線として扱う）
 * @returns 左右の板。分割できない場合（折り線が板を横切らない、
 *          折り線が辺と一致する等）はnull
 *
 * @description
 * エッジウォーク方式（Sutherland–Hodgmanクリッピングの応用）:
 * 1. 各頂点を折り線の左/右/線上に分類
 * 2. 頂点列を順に走査し、左側の頂点はleftBoardへ、右側はrightBoardへ、
 *    線上の頂点は両方へ追加
 * 3. 辺が折り線を跨ぐ場合は交点を計算して両方へ追加
 *
 * 頂点の順序が自然に保たれるため、分割後のソートが不要。
 * 凸多角形の仮定も不要（旧実装のatan2ソート方式との違い）。
 */
export const separateBoard = (
  board: Board,
  foldLine: FoldLine
): SeparatedBoards | null => {
  if (board.length < 3) return null;

  // 折り線が退化している（始点と終点が同じ）場合は分割不可
  if (foldLine.start.distanceTo(foldLine.end) < 1e-6) return null;

  const sides = board.map((vertex) =>
    isPointLeftOfLine(vertex, foldLine.start, foldLine.end)
  );

  const leftBoard: Board = [];
  const rightBoard: Board = [];

  for (let i = 0; i < board.length; i++) {
    const current = board[i];
    const nextIndex = (i + 1) % board.length;
    const next = board[nextIndex];
    const currentSide = sides[i];
    const nextSide = sides[nextIndex];

    // 現在の頂点を振り分け（線上の頂点は両方の板に含める）
    if (currentSide === null) {
      leftBoard.push(current.clone());
      rightBoard.push(current.clone());
    } else if (currentSide) {
      leftBoard.push(current.clone());
    } else {
      rightBoard.push(current.clone());
    }

    // 辺が折り線を跨ぐ場合は交点を両方の板に追加
    if (
      currentSide !== null &&
      nextSide !== null &&
      currentSide !== nextSide
    ) {
      const intersection = calculateEdgeIntersection(current, next, foldLine);
      leftBoard.push(intersection.clone());
      rightBoard.push(intersection);
    }
  }

  // どちらかが多角形を構成できない場合は分割不可
  if (leftBoard.length < 3 || rightBoard.length < 3) return null;

  // 退化した（面積がほぼ0の）板ができる場合も分割不可
  if (calculateArea(leftBoard) < MIN_AREA || calculateArea(rightBoard) < MIN_AREA) {
    return null;
  }

  return { leftBoard, rightBoard };
};

/**
 * 折り線を跨ぐ辺と折り線の交点を計算する
 *
 * @param edgeStart - 辺の始点（折り線の片側にあること）
 * @param edgeEnd - 辺の終点（折り線の反対側にあること）
 * @param foldLine - 折り線
 * @returns 交点
 *
 * @description
 * 辺の両端の折り線からの符号付き距離（外積のz成分）の比から
 * 交点のパラメータtを求める。両端が反対側にあるため分母は0にならない。
 */
const calculateEdgeIntersection = (
  edgeStart: THREE.Vector3,
  edgeEnd: THREE.Vector3,
  foldLine: FoldLine
): THREE.Vector3 => {
  const signedDistance = (point: THREE.Vector3): number =>
    (foldLine.end.x - foldLine.start.x) * (point.y - foldLine.start.y) -
    (foldLine.end.y - foldLine.start.y) * (point.x - foldLine.start.x);

  const distanceStart = signedDistance(edgeStart);
  const distanceEnd = signedDistance(edgeEnd);
  const t = distanceStart / (distanceStart - distanceEnd);

  return new THREE.Vector3().lerpVectors(edgeStart, edgeEnd, t);
};

/**
 * XY平面上の多角形の面積を計算する（靴紐公式）
 *
 * @param board - 多角形の頂点列
 * @returns 面積（絶対値）
 */
const calculateArea = (board: Board): number => {
  let doubleArea = 0;
  for (let i = 0; i < board.length; i++) {
    const current = board[i];
    const next = board[(i + 1) % board.length];
    doubleArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(doubleArea) / 2;
};

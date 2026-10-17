import * as THREE from "three";
import { Board, BoardPiece, FoldLine } from "../../types";
import { isPointLeftOfLine } from "../isPointLeftOfLine";

/** 面積がこの値未満の板は退化しているとみなす */
const MIN_AREA = 1e-6;

/**
 * 板（多角形）を折り線で2つに分割する
 *
 * @param polygon - 分割対象の板（順序付き頂点列、折り畳み空間のXY平面上）
 * @param sourcePolygon - 板の展開図空間でのポリゴン（polygonと同じ長さ・
 *   インデックス対応であること）
 * @param foldLine - 折り線（無限直線として扱う）
 * @returns 分割された2つの片（順序に意味はない）。分割できない場合
 *          （折り線が板を横切らない、折り線が辺と一致する等）はnull
 *
 * @description
 * 頂点列を一周しながら、次の規則で2つの片へ振り分ける:
 * 1. 各頂点は、折り線のどちら側にあるかに応じて片方の片へ追加する
 *    （折り線上にある頂点は両方の片へ追加する）
 * 2. 辺が折り線を跨ぐ場合は交点を計算し、両方の片へ追加する
 *
 * 側の分類・交点パラメータの計算は折り畳み空間（polygon）で行い、
 * sourcePolygonは同じインデックス・同じ補間比率で同期分割する。
 * これにより分割後もpolygonとsourcePolygonの頂点対応が保たれる。
 *
 * 元の頂点の並び順のまま振り分けるため、分割後のソートが不要。
 * 凸多角形の仮定も不要（旧実装のatan2ソート方式との違い）。
 */
export const separateBoard = (
  polygon: Board,
  sourcePolygon: Board,
  foldLine: FoldLine
): [BoardPiece, BoardPiece] | null => {
  if (polygon.length < 3) return null;

  // polygonとsourcePolygonの頂点対応が崩れている場合は分割不可（防御的処理）
  if (polygon.length !== sourcePolygon.length) return null;

  // 折り線が退化している（始点と終点が同じ）場合は分割不可
  if (foldLine.start.distanceTo(foldLine.end) < 1e-6) return null;

  const sides = polygon.map((vertex) =>
    isPointLeftOfLine(vertex, foldLine.start, foldLine.end)
  );

  // 振り分け先の2つの片（折り線のどちら側にあるかで分ける）
  const leftPolygon: Board = [];
  const leftSource: Board = [];
  const rightPolygon: Board = [];
  const rightSource: Board = [];

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const currentSource = sourcePolygon[i];
    const nextIndex = (i + 1) % polygon.length;
    const next = polygon[nextIndex];
    const nextSource = sourcePolygon[nextIndex];
    const currentSide = sides[i];
    const nextSide = sides[nextIndex];

    // 現在の頂点を振り分け（線上の頂点は両方の片に含める）
    if (currentSide === null) {
      leftPolygon.push(current.clone());
      leftSource.push(currentSource.clone());
      rightPolygon.push(current.clone());
      rightSource.push(currentSource.clone());
    } else if (currentSide) {
      leftPolygon.push(current.clone());
      leftSource.push(currentSource.clone());
    } else {
      rightPolygon.push(current.clone());
      rightSource.push(currentSource.clone());
    }

    // 辺が折り線を跨ぐ場合は交点を両方の片に追加
    if (
      currentSide !== null &&
      nextSide !== null &&
      currentSide !== nextSide
    ) {
      const t = calculateIntersectionParameter(current, next, foldLine);
      const intersection = new THREE.Vector3().lerpVectors(current, next, t);
      const sourceIntersection = new THREE.Vector3().lerpVectors(
        currentSource,
        nextSource,
        t
      );
      leftPolygon.push(intersection.clone());
      leftSource.push(sourceIntersection.clone());
      rightPolygon.push(intersection);
      rightSource.push(sourceIntersection);
    }
  }

  // どちらかが多角形を構成できない場合は分割不可
  if (leftPolygon.length < 3 || rightPolygon.length < 3) return null;

  // 退化した（面積がほぼ0の）片ができる場合も分割不可
  if (
    calculateArea(leftPolygon) < MIN_AREA ||
    calculateArea(rightPolygon) < MIN_AREA
  ) {
    return null;
  }

  return [
    { polygon: leftPolygon, sourcePolygon: leftSource },
    { polygon: rightPolygon, sourcePolygon: rightSource },
  ];
};

/**
 * 折り線を跨ぐ辺と折り線の交点のパラメータtを計算する
 *
 * @param edgeStart - 辺の始点（折り線の片側にあること）
 * @param edgeEnd - 辺の終点（折り線の反対側にあること）
 * @param foldLine - 折り線
 * @returns 交点の辺上のパラメータ（edgeStartで0、edgeEndで1）
 *
 * @description
 * 辺の両端の折り線からの符号付き距離（外積のz成分）の比から
 * 交点のパラメータtを求める。両端が反対側にあるため分母は0にならない。
 */
const calculateIntersectionParameter = (
  edgeStart: THREE.Vector3,
  edgeEnd: THREE.Vector3,
  foldLine: FoldLine
): number => {
  const signedDistance = (point: THREE.Vector3): number =>
    (foldLine.end.x - foldLine.start.x) * (point.y - foldLine.start.y) -
    (foldLine.end.y - foldLine.start.y) * (point.x - foldLine.start.x);

  const distanceStart = signedDistance(edgeStart);
  const distanceEnd = signedDistance(edgeEnd);
  return distanceStart / (distanceStart - distanceEnd);
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

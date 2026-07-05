import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { separateBoard } from "./index";
import { Board, FoldLine } from "../../types";

/** 一辺100の正方形（原点中心、XY平面上） */
const createSquareBoard = (): Board => [
  new THREE.Vector3(-50, -50, 0), // 左下
  new THREE.Vector3(50, -50, 0), // 右下
  new THREE.Vector3(50, 50, 0), // 右上
  new THREE.Vector3(-50, 50, 0), // 左上
];

const createFoldLine = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): FoldLine => ({
  start: new THREE.Vector3(startX, startY, 0),
  end: new THREE.Vector3(endX, endY, 0),
});

/** 頂点列に期待する座標が含まれるか判定する */
const containsPoint = (board: Board, x: number, y: number): boolean =>
  board.some(
    (vertex) => Math.abs(vertex.x - x) < 1e-6 && Math.abs(vertex.y - y) < 1e-6
  );

/** 分割結果から指定の座標を含む板を取り出す（順序に依存しないため） */
const findBoardContaining = (
  boards: [Board, Board],
  x: number,
  y: number
): Board | undefined => boards.find((board) => containsPoint(board, x, y));

describe("separateBoard", () => {
  it("中央の縦の折り線で正方形を左右2つの長方形に分割する", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(0, -50, 0, 50);

    const result = separateBoard(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    // x <= 0 の長方形
    const negativeXBoard = findBoardContaining(result, -50, -50);
    expect(negativeXBoard).toBeDefined();
    if (!negativeXBoard) return;
    expect(negativeXBoard).toHaveLength(4);
    expect(containsPoint(negativeXBoard, 0, -50)).toBe(true);
    expect(containsPoint(negativeXBoard, 0, 50)).toBe(true);
    expect(containsPoint(negativeXBoard, -50, 50)).toBe(true);

    // x >= 0 の長方形
    const positiveXBoard = findBoardContaining(result, 50, -50);
    expect(positiveXBoard).toBeDefined();
    if (!positiveXBoard) return;
    expect(positiveXBoard).toHaveLength(4);
    expect(containsPoint(positiveXBoard, 0, -50)).toBe(true);
    expect(containsPoint(positiveXBoard, 50, 50)).toBe(true);
    expect(containsPoint(positiveXBoard, 0, 50)).toBe(true);
  });

  it("対角線の折り線（頂点2つを通過）で2つの三角形に分割する", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(-50, -50, 50, 50);

    const result = separateBoard(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    // 線上の頂点(-50,-50)と(50,50)は両方の板に含まれる
    result.forEach((separated) => {
      expect(separated).toHaveLength(3);
      expect(containsPoint(separated, -50, -50)).toBe(true);
      expect(containsPoint(separated, 50, 50)).toBe(true);
    });

    // 対角線の両側の頂点はそれぞれ片方の板にのみ含まれる
    const upperTriangle = findBoardContaining(result, -50, 50);
    const lowerTriangle = findBoardContaining(result, 50, -50);
    expect(upperTriangle).toBeDefined();
    expect(lowerTriangle).toBeDefined();
    expect(upperTriangle).not.toBe(lowerTriangle);
  });

  it("頂点1つを通過する折り線で三角形と四角形に分割する", () => {
    const board = createSquareBoard();
    // 左下の頂点(-50,-50)を通り、右辺の中点(50,0)へ抜ける折り線
    const foldLine = createFoldLine(-50, -50, 50, 0);

    const result = separateBoard(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    const [smaller, larger] = [...result].sort((a, b) => a.length - b.length);

    // 下側: 三角形 (-50,-50), (50,-50), (50,0)
    expect(smaller).toHaveLength(3);
    expect(containsPoint(smaller, -50, -50)).toBe(true);
    expect(containsPoint(smaller, 50, -50)).toBe(true);
    expect(containsPoint(smaller, 50, 0)).toBe(true);

    // 上側: 四角形 (-50,-50), (50,0), (50,50), (-50,50)
    expect(larger).toHaveLength(4);
    expect(containsPoint(larger, -50, -50)).toBe(true);
    expect(containsPoint(larger, 50, 0)).toBe(true);
    expect(containsPoint(larger, 50, 50)).toBe(true);
    expect(containsPoint(larger, -50, 50)).toBe(true);
  });

  it("角を切り落とす折り線で三角形と五角形に分割する", () => {
    const board = createSquareBoard();
    // 下辺の中点(0,-50)から左辺の中点(-50,0)へ抜ける折り線
    const foldLine = createFoldLine(0, -50, -50, 0);

    const result = separateBoard(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    const [smaller, larger] = [...result].sort((a, b) => a.length - b.length);

    // 左下の角: 三角形 (-50,-50), (0,-50), (-50,0)
    expect(smaller).toHaveLength(3);
    expect(containsPoint(smaller, -50, -50)).toBe(true);
    expect(containsPoint(smaller, 0, -50)).toBe(true);
    expect(containsPoint(smaller, -50, 0)).toBe(true);

    // 残り: 五角形
    expect(larger).toHaveLength(5);
  });

  it("分割後も頂点の順序が保たれる（隣接頂点間の辺が交差しない）", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(0, -50, 0, 50);

    const result = separateBoard(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    // x <= 0 の板の頂点順: (-50,-50) → (0,-50) → (0,50) → (-50,50)
    // 隣接する頂点同士は必ず辺を共有する（x座標かy座標が一致する長方形）
    const negativeXBoard = findBoardContaining(result, -50, -50);
    expect(negativeXBoard).toBeDefined();
    if (!negativeXBoard) return;
    for (let i = 0; i < negativeXBoard.length; i++) {
      const current = negativeXBoard[i];
      const next = negativeXBoard[(i + 1) % negativeXBoard.length];
      const sharesEdge =
        Math.abs(current.x - next.x) < 1e-6 ||
        Math.abs(current.y - next.y) < 1e-6;
      expect(sharesEdge).toBe(true);
    }
  });

  it("折り線が辺と一致する場合はnullを返す", () => {
    const board = createSquareBoard();
    // 下辺と一致する折り線
    const foldLine = createFoldLine(-50, -50, 50, -50);

    expect(separateBoard(board, foldLine)).toBeNull();
  });

  it("折り線が板の外側を通る場合はnullを返す", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(100, -50, 100, 50);

    expect(separateBoard(board, foldLine)).toBeNull();
  });

  it("折り線が頂点1つにのみ接する場合はnullを返す", () => {
    const board = createSquareBoard();
    // 右上の頂点(50,50)にのみ接する折り線
    const foldLine = createFoldLine(0, 100, 100, 0);

    expect(separateBoard(board, foldLine)).toBeNull();
  });

  it("折り線の始点と終点が同じ場合はnullを返す", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(0, 0, 0, 0);

    expect(separateBoard(board, foldLine)).toBeNull();
  });

  it("頂点が3つ未満の板はnullを返す", () => {
    const board: Board = [
      new THREE.Vector3(-50, 0, 0),
      new THREE.Vector3(50, 0, 0),
    ];
    const foldLine = createFoldLine(0, -50, 0, 50);

    expect(separateBoard(board, foldLine)).toBeNull();
  });

  it("三角形の板も分割できる（1回折った後の板を想定）", () => {
    const triangle: Board = [
      new THREE.Vector3(-50, -50, 0),
      new THREE.Vector3(50, -50, 0),
      new THREE.Vector3(-50, 50, 0),
    ];
    // 縦の折り線で三角形と四角形に分割
    const foldLine = createFoldLine(0, -50, 0, 50);

    const result = separateBoard(triangle, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    const [smaller, larger] = [...result].sort((a, b) => a.length - b.length);
    expect(smaller).toHaveLength(3);
    expect(larger).toHaveLength(4);
    // 斜辺 y = -x と x = 0 の交点 (0, 0)
    expect(containsPoint(smaller, 0, 0)).toBe(true);
    expect(containsPoint(smaller, 0, -50)).toBe(true);
  });
});

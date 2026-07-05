import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { separateBoard } from "./index";
import { Board, BoardPiece, FoldLine } from "../../types";

/** 一辺100の正方形（原点中心、XY平面上） */
const createSquareBoard = (): Board => [
  new THREE.Vector3(-50, -50, 0), // 左下
  new THREE.Vector3(50, -50, 0), // 右下
  new THREE.Vector3(50, 50, 0), // 右上
  new THREE.Vector3(-50, 50, 0), // 左上
];

/** 展開図が折り畳み空間と一致する状態（折る前の板）で分割する */
const separateWithIdentitySource = (
  board: Board,
  foldLine: FoldLine
): [BoardPiece, BoardPiece] | null =>
  separateBoard(
    board,
    board.map((vertex) => vertex.clone()),
    foldLine
  );

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

/** 分割結果から指定の座標を含む片を取り出す（順序に依存しないため） */
const findPieceContaining = (
  pieces: [BoardPiece, BoardPiece],
  x: number,
  y: number
): BoardPiece | undefined =>
  pieces.find((piece) => containsPoint(piece.polygon, x, y));

describe("separateBoard", () => {
  it("中央の縦の折り線で正方形を左右2つの長方形に分割する", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(0, -50, 0, 50);

    const result = separateWithIdentitySource(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    // x <= 0 の長方形
    const negativeXPiece = findPieceContaining(result, -50, -50);
    expect(negativeXPiece).toBeDefined();
    if (!negativeXPiece) return;
    expect(negativeXPiece.polygon).toHaveLength(4);
    expect(containsPoint(negativeXPiece.polygon, 0, -50)).toBe(true);
    expect(containsPoint(negativeXPiece.polygon, 0, 50)).toBe(true);
    expect(containsPoint(negativeXPiece.polygon, -50, 50)).toBe(true);

    // x >= 0 の長方形
    const positiveXPiece = findPieceContaining(result, 50, -50);
    expect(positiveXPiece).toBeDefined();
    if (!positiveXPiece) return;
    expect(positiveXPiece.polygon).toHaveLength(4);
    expect(containsPoint(positiveXPiece.polygon, 0, -50)).toBe(true);
    expect(containsPoint(positiveXPiece.polygon, 50, 50)).toBe(true);
    expect(containsPoint(positiveXPiece.polygon, 0, 50)).toBe(true);
  });

  it("sourcePolygonがpolygonと同じインデックス・同じ補間比率で分割される", () => {
    const board = createSquareBoard();
    // 展開図はx方向に+100ずれた正方形（頂点対応はインデックス順）
    const sourcePolygon = board.map(
      (vertex) => new THREE.Vector3(vertex.x + 100, vertex.y, 0)
    );
    // 折り畳み空間のx=10で分割 → 展開図ではx=110で分割されるはず
    const foldLine = createFoldLine(10, -50, 10, 50);

    const result = separateBoard(board, sourcePolygon, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    result.forEach((piece) => {
      // polygonとsourcePolygonの頂点対応が保たれる
      expect(piece.sourcePolygon).toHaveLength(piece.polygon.length);
      piece.polygon.forEach((vertex, index) => {
        expect(piece.sourcePolygon[index].x).toBeCloseTo(vertex.x + 100);
        expect(piece.sourcePolygon[index].y).toBeCloseTo(vertex.y);
      });

      // 分割線上の交点も展開図側で同じ比率の位置になる
      expect(containsPoint(piece.sourcePolygon, 110, -50)).toBe(true);
      expect(containsPoint(piece.sourcePolygon, 110, 50)).toBe(true);
    });
  });

  it("polygonとsourcePolygonの長さが一致しない場合はnullを返す", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(0, -50, 0, 50);

    expect(separateBoard(board, board.slice(0, 3), foldLine)).toBeNull();
  });

  it("対角線の折り線（頂点2つを通過）で2つの三角形に分割する", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(-50, -50, 50, 50);

    const result = separateWithIdentitySource(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    // 線上の頂点(-50,-50)と(50,50)は両方の片に含まれる
    result.forEach((piece) => {
      expect(piece.polygon).toHaveLength(3);
      expect(containsPoint(piece.polygon, -50, -50)).toBe(true);
      expect(containsPoint(piece.polygon, 50, 50)).toBe(true);
    });

    // 対角線の両側の頂点はそれぞれ片方の片にのみ含まれる
    const upperTriangle = findPieceContaining(result, -50, 50);
    const lowerTriangle = findPieceContaining(result, 50, -50);
    expect(upperTriangle).toBeDefined();
    expect(lowerTriangle).toBeDefined();
    expect(upperTriangle).not.toBe(lowerTriangle);
  });

  it("頂点1つを通過する折り線で三角形と四角形に分割する", () => {
    const board = createSquareBoard();
    // 左下の頂点(-50,-50)を通り、右辺の中点(50,0)へ抜ける折り線
    const foldLine = createFoldLine(-50, -50, 50, 0);

    const result = separateWithIdentitySource(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    const [smaller, larger] = [...result].sort(
      (a, b) => a.polygon.length - b.polygon.length
    );

    // 下側: 三角形 (-50,-50), (50,-50), (50,0)
    expect(smaller.polygon).toHaveLength(3);
    expect(containsPoint(smaller.polygon, -50, -50)).toBe(true);
    expect(containsPoint(smaller.polygon, 50, -50)).toBe(true);
    expect(containsPoint(smaller.polygon, 50, 0)).toBe(true);

    // 上側: 四角形 (-50,-50), (50,0), (50,50), (-50,50)
    expect(larger.polygon).toHaveLength(4);
    expect(containsPoint(larger.polygon, -50, -50)).toBe(true);
    expect(containsPoint(larger.polygon, 50, 0)).toBe(true);
    expect(containsPoint(larger.polygon, 50, 50)).toBe(true);
    expect(containsPoint(larger.polygon, -50, 50)).toBe(true);
  });

  it("角を切り落とす折り線で三角形と五角形に分割する", () => {
    const board = createSquareBoard();
    // 下辺の中点(0,-50)から左辺の中点(-50,0)へ抜ける折り線
    const foldLine = createFoldLine(0, -50, -50, 0);

    const result = separateWithIdentitySource(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    const [smaller, larger] = [...result].sort(
      (a, b) => a.polygon.length - b.polygon.length
    );

    // 左下の角: 三角形 (-50,-50), (0,-50), (-50,0)
    expect(smaller.polygon).toHaveLength(3);
    expect(containsPoint(smaller.polygon, -50, -50)).toBe(true);
    expect(containsPoint(smaller.polygon, 0, -50)).toBe(true);
    expect(containsPoint(smaller.polygon, -50, 0)).toBe(true);

    // 残り: 五角形
    expect(larger.polygon).toHaveLength(5);
  });

  it("分割後も頂点の順序が保たれる（隣接頂点間の辺が交差しない）", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(0, -50, 0, 50);

    const result = separateWithIdentitySource(board, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    // x <= 0 の片の頂点順: (-50,-50) → (0,-50) → (0,50) → (-50,50)
    // 隣接する頂点同士は必ず辺を共有する（x座標かy座標が一致する長方形）
    const negativeXPiece = findPieceContaining(result, -50, -50);
    expect(negativeXPiece).toBeDefined();
    if (!negativeXPiece) return;
    const polygon = negativeXPiece.polygon;
    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i];
      const next = polygon[(i + 1) % polygon.length];
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

    expect(separateWithIdentitySource(board, foldLine)).toBeNull();
  });

  it("折り線が板の外側を通る場合はnullを返す", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(100, -50, 100, 50);

    expect(separateWithIdentitySource(board, foldLine)).toBeNull();
  });

  it("折り線が頂点1つにのみ接する場合はnullを返す", () => {
    const board = createSquareBoard();
    // 右上の頂点(50,50)にのみ接する折り線
    const foldLine = createFoldLine(0, 100, 100, 0);

    expect(separateWithIdentitySource(board, foldLine)).toBeNull();
  });

  it("折り線の始点と終点が同じ場合はnullを返す", () => {
    const board = createSquareBoard();
    const foldLine = createFoldLine(0, 0, 0, 0);

    expect(separateWithIdentitySource(board, foldLine)).toBeNull();
  });

  it("頂点が3つ未満の板はnullを返す", () => {
    const board: Board = [
      new THREE.Vector3(-50, 0, 0),
      new THREE.Vector3(50, 0, 0),
    ];
    const foldLine = createFoldLine(0, -50, 0, 50);

    expect(separateWithIdentitySource(board, foldLine)).toBeNull();
  });

  it("三角形の板も分割できる（1回折った後の板を想定）", () => {
    const triangle: Board = [
      new THREE.Vector3(-50, -50, 0),
      new THREE.Vector3(50, -50, 0),
      new THREE.Vector3(-50, 50, 0),
    ];
    // 縦の折り線で三角形と四角形に分割
    const foldLine = createFoldLine(0, -50, 0, 50);

    const result = separateWithIdentitySource(triangle, foldLine);

    expect(result).not.toBeNull();
    if (!result) return;

    const [smaller, larger] = [...result].sort(
      (a, b) => a.polygon.length - b.polygon.length
    );
    expect(smaller.polygon).toHaveLength(3);
    expect(larger.polygon).toHaveLength(4);
    // 斜辺 y = -x と x = 0 の交点 (0, 0)
    expect(containsPoint(smaller.polygon, 0, 0)).toBe(true);
    expect(containsPoint(smaller.polygon, 0, -50)).toBe(true);
  });
});

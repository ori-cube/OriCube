import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applyFoldStep } from "./index";
import { Board, FoldStep, LayeredBoard } from "../../types";

/** 一辺100の正方形（原点中心、XY平面上） */
const createSquare = (layer: number): LayeredBoard => ({
  polygon: [
    new THREE.Vector3(-50, -50, 0),
    new THREE.Vector3(50, -50, 0),
    new THREE.Vector3(50, 50, 0),
    new THREE.Vector3(-50, 50, 0),
  ],
  layer,
});

/** x=0の縦の折り線で右上の頂点をドラッグした折り操作 */
const createVerticalFoldStep = (
  overrides: Partial<FoldStep> = {}
): FoldStep => ({
  foldLine: {
    start: new THREE.Vector3(0, -50, 0),
    end: new THREE.Vector3(0, 50, 0),
  },
  dragVertex: new THREE.Vector3(50, 50, 0),
  foldCount: 1,
  viewFront: true,
  ...overrides,
});

/** 頂点列に期待する座標が含まれるか判定する */
const containsPoint = (board: Board, x: number, y: number): boolean =>
  board.some(
    (vertex) => Math.abs(vertex.x - x) < 1e-6 && Math.abs(vertex.y - y) < 1e-6
  );

/** 指定レイヤーの板を取り出す */
const findBoardAtLayer = (
  boards: LayeredBoard[],
  layer: number
): LayeredBoard | undefined => boards.find((board) => board.layer === layer);

describe("applyFoldStep", () => {
  it("1枚の板を半分に折ると、固定片と反転した動く片の2枚になる", () => {
    const result = applyFoldStep([createSquare(0)], createVerticalFoldStep());

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.boards).toHaveLength(2);

    // 固定片は元のレイヤーのまま左半分
    const staticBoard = findBoardAtLayer(result.boards, 0);
    expect(staticBoard).toBeDefined();
    if (!staticBoard) return;
    expect(containsPoint(staticBoard.polygon, -50, -50)).toBe(true);
    expect(containsPoint(staticBoard.polygon, 0, 50)).toBe(true);

    // 動く片は上のレイヤーに移り、x=0で鏡映された座標になる
    const movingBoard = findBoardAtLayer(result.boards, 1);
    expect(movingBoard).toBeDefined();
    if (!movingBoard) return;
    expect(containsPoint(movingBoard.polygon, -50, 50)).toBe(true);
    expect(containsPoint(movingBoard.polygon, -50, -50)).toBe(true);
    expect(containsPoint(movingBoard.polygon, 0, 50)).toBe(true);

    // 全頂点がXY平面上（z=0）に保たれる
    expect(
      result.boards.every((board) =>
        board.polygon.every((vertex) => vertex.z === 0)
      )
    ).toBe(true);
  });

  it("アニメーション用に回転前の動く片と動かない板を返す", () => {
    const result = applyFoldStep([createSquare(0)], createVerticalFoldStep());

    expect(result).not.toBeNull();
    if (!result) return;

    // 動く片は回転前の座標（右半分）・元のレイヤー
    expect(result.movingBoards).toHaveLength(1);
    expect(result.movingBoards[0].layer).toBe(0);
    expect(containsPoint(result.movingBoards[0].polygon, 50, 50)).toBe(true);

    // 動かない板は固定片（左半分）
    expect(result.staticBoards).toHaveLength(1);
    expect(containsPoint(result.staticBoards[0].polygon, -50, -50)).toBe(true);
  });

  it("重なった2枚をまとめて折ると、動く片の重なり順が逆転して上に積まれる", () => {
    // 下: 一辺100の正方形（レイヤー0）、上: 右上4分の1の板（レイヤー1）
    // どちらも(50, 50)に頂点を持ち、x=25の折り線で両方折る
    const quarter: LayeredBoard = {
      polygon: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(50, 0, 0),
        new THREE.Vector3(50, 50, 0),
        new THREE.Vector3(0, 50, 0),
      ],
      layer: 1,
    };
    const step = createVerticalFoldStep({
      foldLine: {
        start: new THREE.Vector3(25, -50, 0),
        end: new THREE.Vector3(25, 50, 0),
      },
      foldCount: 2,
    });

    const result = applyFoldStep([createSquare(0), quarter], step);

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.boards).toHaveLength(4);

    // レイヤー0の板（正方形）の動く片は一番上（レイヤー3）に積まれる
    const topBoard = findBoardAtLayer(result.boards, 3);
    expect(topBoard).toBeDefined();
    if (!topBoard) return;
    expect(containsPoint(topBoard.polygon, 0, -50)).toBe(true);

    // レイヤー1の板（4分の1）の動く片はその下（レイヤー2）に積まれる
    const secondBoard = findBoardAtLayer(result.boards, 2);
    expect(secondBoard).toBeDefined();
    if (!secondBoard) return;
    expect(containsPoint(secondBoard.polygon, 0, 0)).toBe(true);
    expect(containsPoint(secondBoard.polygon, 0, -50)).toBe(false);
  });

  it("重なった2枚のうち1枚だけ折ると、表側の板だけが折られる", () => {
    const boards = [createSquare(0), createSquare(1)];
    const result = applyFoldStep(boards, createVerticalFoldStep());

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.boards).toHaveLength(3);

    // 表側（レイヤー1）の板が折られ、動く片はレイヤー2へ
    expect(findBoardAtLayer(result.boards, 2)).toBeDefined();

    // 裏側（レイヤー0）の板は正方形のまま動かない
    const untouched = findBoardAtLayer(result.boards, 0);
    expect(untouched).toBeDefined();
    if (!untouched) return;
    expect(untouched.polygon).toHaveLength(4);
    expect(containsPoint(untouched.polygon, 50, 50)).toBe(true);
    expect(result.staticBoards).toContain(untouched);
  });

  it("裏側から見て折ると、裏側の板が折られて動く片は下に積まれる", () => {
    const boards = [createSquare(0), createSquare(1)];
    const result = applyFoldStep(
      boards,
      createVerticalFoldStep({ viewFront: false })
    );

    expect(result).not.toBeNull();
    if (!result) return;

    // 裏側（レイヤー0）の板が折られ、動く片は最小レイヤーの下（レイヤー-1）へ
    expect(findBoardAtLayer(result.boards, -1)).toBeDefined();

    // 表側（レイヤー1）の板は動かない
    const untouched = findBoardAtLayer(result.boards, 1);
    expect(untouched).toBeDefined();
    if (!untouched) return;
    expect(untouched.polygon).toHaveLength(4);
  });

  it("折り線が対象の板を横切らない場合はnullを返す", () => {
    const step = createVerticalFoldStep({
      foldLine: {
        start: new THREE.Vector3(60, -50, 0),
        end: new THREE.Vector3(60, 50, 0),
      },
    });

    expect(applyFoldStep([createSquare(0)], step)).toBeNull();
  });

  it("ドラッグした頂点が折り線上にある場合はnullを返す", () => {
    const step = createVerticalFoldStep({
      foldLine: {
        start: new THREE.Vector3(-50, -50, 0),
        end: new THREE.Vector3(50, 50, 0),
      },
    });

    expect(applyFoldStep([createSquare(0)], step)).toBeNull();
  });

  it("ドラッグした頂点を持つ板がない場合はnullを返す", () => {
    const step = createVerticalFoldStep({
      dragVertex: new THREE.Vector3(10, 10, 0),
    });

    expect(applyFoldStep([createSquare(0)], step)).toBeNull();
  });

  it("折る枚数が候補の板の数を超える場合はnullを返す", () => {
    const step = createVerticalFoldStep({ foldCount: 2 });

    expect(applyFoldStep([createSquare(0)], step)).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applyFoldStep } from "./index";
import { replayFoldSteps } from "../replayFoldSteps";
import { createSquareBoard } from "../createSquareBoard";
import { Board, FoldStep, LayeredBoard, OrigamiStep } from "../../types";

/** 一辺100の正方形の頂点列（原点中心、XY平面上） */
const createSquarePolygon = (offsetX = 0): Board => [
  new THREE.Vector3(-50 + offsetX, -50, 0),
  new THREE.Vector3(50 + offsetX, -50, 0),
  new THREE.Vector3(50 + offsetX, 50, 0),
  new THREE.Vector3(-50 + offsetX, 50, 0),
];

/**
 * 一辺100の正方形（原点中心、XY平面上）
 *
 * sourceOffsetXを指定すると展開図上で離れた位置になり、他の板と
 * つながっていない（折り目を共有しない）独立した板を表せる
 */
const createSquare = (layer: number, sourceOffsetX = 0): LayeredBoard => ({
  polygon: createSquarePolygon(),
  sourcePolygon: createSquarePolygon(sourceOffsetX),
  layer,
});

/** x=0の縦の折り線で右上の頂点をドラッグした折り操作 */
const createVerticalFoldStep = (
  overrides: Partial<FoldStep> = {}
): FoldStep => ({
  kind: "fold",
  foldLine: {
    start: new THREE.Vector3(0, -50, 0),
    end: new THREE.Vector3(0, 50, 0),
  },
  dragVertex: new THREE.Vector3(50, 50, 0),
  foldCount: 1,
  viewFront: true,
  ...overrides,
});

/** y=0の横の折り線の折り操作（半分折り後の破れ判定シナリオ用） */
const createHorizontalFoldStep = (
  overrides: Partial<FoldStep> = {}
): FoldStep => ({
  kind: "fold",
  foldLine: {
    start: new THREE.Vector3(-50, 0, 0),
    end: new THREE.Vector3(50, 0, 0),
  },
  dragVertex: new THREE.Vector3(0, 50, 0),
  foldCount: 1,
  viewFront: true,
  ...overrides,
});

/**
 * x=0で半分に折った後の板群を作る
 * （左半分の固定片レイヤー0の上に、右半分の片レイヤー1が重なり、
 *   x=0の折り目でつながった状態）
 */
const createHalfFoldedBoards = (): LayeredBoard[] => {
  const result = applyFoldStep([createSquare(0)], createVerticalFoldStep());
  if (!result) throw new Error("半分折りが成立しませんでした");
  return result.boards;
};

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

  it("sourcePolygonは鏡映されず、分割された展開図の座標を保持する", () => {
    const result = applyFoldStep([createSquare(0)], createVerticalFoldStep());

    expect(result).not.toBeNull();
    if (!result) return;

    // 固定片の展開図は左半分のまま
    const staticBoard = findBoardAtLayer(result.boards, 0);
    expect(staticBoard).toBeDefined();
    if (!staticBoard) return;
    expect(containsPoint(staticBoard.sourcePolygon, -50, -50)).toBe(true);
    expect(containsPoint(staticBoard.sourcePolygon, 0, 50)).toBe(true);

    // 動く片の展開図は折る前の右半分のまま（鏡映されない）
    const movingBoard = findBoardAtLayer(result.boards, 1);
    expect(movingBoard).toBeDefined();
    if (!movingBoard) return;
    expect(containsPoint(movingBoard.sourcePolygon, 50, 50)).toBe(true);
    expect(containsPoint(movingBoard.sourcePolygon, 0, 50)).toBe(true);
    expect(containsPoint(movingBoard.sourcePolygon, -50, 50)).toBe(false);
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
    const quarterPolygon: Board = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(50, 0, 0),
      new THREE.Vector3(50, 50, 0),
      new THREE.Vector3(0, 50, 0),
    ];
    const quarter: LayeredBoard = {
      polygon: quarterPolygon,
      sourcePolygon: quarterPolygon.map((vertex) => vertex.clone()),
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
    // 展開図上でつながっていない2枚（独立した板）を重ねた状態
    const boards = [createSquare(0), createSquare(1, 200)];
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
    const boards = [createSquare(0), createSquare(1, 200)];
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

  describe("破れ判定（展開図の折り目でつながった板）", () => {
    it("折り目上の頂点から1枚だけ折ろうとするとnullを返す（紙が破れる折り）", () => {
      const boards = createHalfFoldedBoards();

      // 折り目(x=0)上の頂点(0, 50)をドラッグしてy=0で1枚折り
      // → 動く片が折り目の一部を置き去りにするので破れる
      expect(
        applyFoldStep(boards, createHorizontalFoldStep({ foldCount: 1 }))
      ).toBeNull();

      // つながっている2枚をまとめて折れば成立する
      const result = applyFoldStep(
        boards,
        createHorizontalFoldStep({ foldCount: 2 })
      );
      expect(result).not.toBeNull();
      expect(result?.boards).toHaveLength(4);
    });

    it("折り目上でない頂点からでも、折り線が折り目を横切る1枚折りはnullを返す", () => {
      const boards = createHalfFoldedBoards();

      // 開いた側の角(-50, 50)をドラッグ。y=0の折り線は折り目(x=0)を横切るため
      // 1枚だけ折ると折り目の上半分が破れる
      const step = createHorizontalFoldStep({
        dragVertex: new THREE.Vector3(-50, 50, 0),
        foldCount: 1,
      });
      expect(applyFoldStep(boards, step)).toBeNull();

      // 2枚まとめて折れば成立する
      const result = applyFoldStep(
        boards,
        createHorizontalFoldStep({
          dragVertex: new THREE.Vector3(-50, 50, 0),
          foldCount: 2,
        })
      );
      expect(result).not.toBeNull();
      expect(result?.boards).toHaveLength(4);
    });

    it("折り目に届かない折りなら1枚だけでも折れる（フラップの角折り）", () => {
      const boards = createHalfFoldedBoards();

      // 開いた側の角(-50, 50)を、折り目(x=0)に届かない折り線で折る
      const step = createHorizontalFoldStep({
        foldLine: {
          start: new THREE.Vector3(-50, 10, 0),
          end: new THREE.Vector3(-10, 50, 0),
        },
        dragVertex: new THREE.Vector3(-50, 50, 0),
        foldCount: 1,
      });

      const result = applyFoldStep(boards, step);

      expect(result).not.toBeNull();
      expect(result?.boards).toHaveLength(3);
    });

    it("観音折りは折り畳み空間で接していても展開図でつながっていないので成立する", () => {
      // 左端を中心へ折る（フラップは x: -25〜0 に着地）
      const firstStep = createVerticalFoldStep({
        foldLine: {
          start: new THREE.Vector3(-25, -50, 0),
          end: new THREE.Vector3(-25, 50, 0),
        },
        dragVertex: new THREE.Vector3(-50, 50, 0),
      });
      const first = applyFoldStep([createSquare(0)], firstStep);
      expect(first).not.toBeNull();
      if (!first) return;

      // 右端を中心へ折る（フラップは x: 0〜25 に着地し、左のフラップと
      // x=0で接するがつながってはいない）
      const secondStep = createVerticalFoldStep({
        foldLine: {
          start: new THREE.Vector3(25, -50, 0),
          end: new THREE.Vector3(25, 50, 0),
        },
        dragVertex: new THREE.Vector3(50, 50, 0),
      });
      const second = applyFoldStep(first.boards, secondStep);

      expect(second).not.toBeNull();
      if (!second) return;

      expect(second.boards).toHaveLength(3);

      // 左右のフラップの縁がどちらもx=0にあり、同じ位置で接している
      const leftFlap = findBoardAtLayer(second.boards, 1);
      const rightFlap = findBoardAtLayer(second.boards, 2);
      expect(leftFlap).toBeDefined();
      expect(rightFlap).toBeDefined();
      if (!leftFlap || !rightFlap) return;
      expect(containsPoint(leftFlap.polygon, 0, 50)).toBe(true);
      expect(containsPoint(rightFlap.polygon, 0, 50)).toBe(true);
    });
  });

  describe("既存の折り目に沿って畳む折り（板を分割しない折り）", () => {
    it("折り目に沿って1枚めくると、板は分割されず丸ごと反対側へ移る", () => {
      // 半分折り後、動いた片（レイヤー1）を折り目x=0に沿ってめくり戻す
      const boards = createHalfFoldedBoards();
      const step = createVerticalFoldStep({
        dragVertex: new THREE.Vector3(-50, 50, 0),
        foldCount: 1,
      });

      const result = applyFoldStep(boards, step);

      expect(result).not.toBeNull();
      if (!result) return;

      // 分割されないため板の数は変わらない
      expect(result.boards).toHaveLength(2);

      // めくられた板は丸ごと右半分へ移り、最前面に積まれる
      const turned = findBoardAtLayer(result.boards, 2);
      expect(turned).toBeDefined();
      if (!turned) return;
      expect(containsPoint(turned.polygon, 50, 50)).toBe(true);
      expect(containsPoint(turned.polygon, 50, -50)).toBe(true);

      // 動かない板（左半分）はそのまま残る
      const staticBoard = findBoardAtLayer(result.boards, 0);
      expect(staticBoard).toBeDefined();
      if (!staticBoard) return;
      expect(containsPoint(staticBoard.polygon, -50, 50)).toBe(true);

      // アニメーション用の動く片も分割されていない
      expect(result.movingBoards).toHaveLength(1);
      expect(result.movingBoards[0].polygon).toHaveLength(4);
      expect(result.staticBoards).toHaveLength(1);
    });

    it("全ての板を丸ごと回すだけの操作はnullを返す（折りではない）", () => {
      // 2枚とも折り目の同じ側にあり、どの板も分割されず、動かない板もない
      const boards = createHalfFoldedBoards();
      const step = createVerticalFoldStep({
        dragVertex: new THREE.Vector3(-50, 50, 0),
        foldCount: 2,
      });

      expect(applyFoldStep(boards, step)).toBeNull();
    });

    it("鶴の基本形を中心の折り目に沿って半分に畳める", () => {
      const v = (x: number, y: number): THREE.Vector3 =>
        new THREE.Vector3(x, y, 0);
      const creaseArm = 20 * (2 - Math.SQRT2);
      const craneSteps: OrigamiStep[] = [
        {
          kind: "fold",
          foldLine: { start: v(-20, -20), end: v(20, 20) },
          dragVertex: v(-20, 20),
          foldCount: 1,
          viewFront: true,
        },
        {
          kind: "fold",
          foldLine: { start: v(-20, 20), end: v(20, -20) },
          dragVertex: v(-20, -20),
          foldCount: 2,
          viewFront: true,
        },
        {
          kind: "squash",
          foldLine: { start: v(0, 0), end: v(20, 0) },
          dragVertex: v(20, 20),
          viewFront: true,
        },
        {
          kind: "squash",
          foldLine: { start: v(0, 0), end: v(20, 0) },
          dragVertex: v(20, 20),
          viewFront: false,
        },
        {
          kind: "petal",
          foldLine: { start: v(creaseArm, 0), end: v(0, -creaseArm) },
          dragVertex: v(20, -20),
          viewFront: true,
        },
        {
          kind: "petal",
          foldLine: { start: v(creaseArm, 0), end: v(0, -creaseArm) },
          dragVertex: v(20, -20),
          viewFront: false,
        },
      ];
      const birdBase = replayFoldSteps(createSquareBoard(40), craneSteps);
      expect(birdBase).toHaveLength(20);

      // 横の角をつまんで、中心の対角線（スパイン）で全体を半分に畳む
      const step: FoldStep = {
        kind: "fold",
        foldLine: { start: v(0, 0), end: v(20, -20) },
        dragVertex: v(creaseArm, 0),
        foldCount: 10,
        viewFront: true,
      };

      const result = applyFoldStep(birdBase, step);
      expect(result).not.toBeNull();
      if (!result) return;

      // 板は分割されず20枚のまま、全ての板が折り目の左側（y <= -x）に収まる
      expect(result.boards).toHaveLength(20);
      expect(
        result.boards.every((board) =>
          board.polygon.every((vertex) => vertex.x + vertex.y <= 1e-6)
        )
      ).toBe(true);
    });
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

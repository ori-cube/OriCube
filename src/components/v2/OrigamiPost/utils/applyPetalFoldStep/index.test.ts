import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applyPetalFoldStep, buildPetalFoldStep } from "./index";
import { replayFoldSteps } from "../replayFoldSteps";
import { createSquareBoard } from "../createSquareBoard";
import {
  Board,
  FoldStep,
  LayeredBoard,
  OrigamiStep,
  PetalFoldStep,
} from "../../types";

const v = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);

/**
 * 一辺40の正方形から鶴の正方基本形（8枚）を作る
 *
 * 先端V=(20,-20)に4隅が集まり、C=(0,0)が閉じた角になる。
 * 前面はレイヤー6（右半分、折り目C-(20,0)でレイヤー3と接続）と
 * レイヤー5（左半分、折り目C-(0,-20)でレイヤー4と接続）
 */
const createSquareBaseBoards = (): LayeredBoard[] => {
  const steps: OrigamiStep[] = [
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
  ];
  const boards = replayFoldSteps(createSquareBoard(40), steps);
  if (boards.length !== 8) {
    throw new Error("前提の正方基本形が成立しませんでした");
  }
  return boards;
};

// 正方基本形の花弁折りの正準幾何（一辺40、V=(20,-20)、C=(0,0)）
const CREASE_ARM = 20 * (2 - Math.SQRT2);
/** 折り線とスパインの交点A */
const FOLD_CENTER = { x: 20 - 10 * Math.SQRT2, y: 10 * Math.SQRT2 - 20 };
/** 折り線と右の折り目C-(20,0)の交点 */
const P_RIGHT = { x: CREASE_ARM, y: 0 };
/** 折り線と左の折り目C-(0,-20)の交点 */
const P_LEFT = { x: 0, y: -CREASE_ARM };
/** 先端Vの畳み先（スパイン延長上） */
const TIP_FINAL = { x: 20 - 20 * Math.SQRT2, y: 20 * Math.SQRT2 - 20 };

/** 正準化済みの折り線を持つ花弁折りステップ */
const createPetalStep = (
  overrides: Partial<PetalFoldStep> = {}
): PetalFoldStep => ({
  kind: "petal",
  foldLine: {
    start: v(P_RIGHT.x, P_RIGHT.y),
    end: v(P_LEFT.x, P_LEFT.y),
  },
  dragVertex: v(20, -20),
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

describe("applyPetalFoldStep", () => {
  it("正方基本形から花弁折りすると、先端が持ち上がった14枚になる", () => {
    const result = applyPetalFoldStep(
      createSquareBaseBoards(),
      createPetalStep()
    );

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.boards).toHaveLength(14);

    // 前面フラップの中央片は折り線で鏡映され、先端がスパイン延長上へ最前面に
    const centralRight = findBoardAtLayer(result.boards, 12);
    expect(centralRight).toBeDefined();
    if (!centralRight) return;
    expect(containsPoint(centralRight.polygon, TIP_FINAL.x, TIP_FINAL.y)).toBe(
      true
    );
    expect(containsPoint(centralRight.polygon, P_RIGHT.x, P_RIGHT.y)).toBe(
      true
    );
    expect(
      containsPoint(centralRight.polygon, FOLD_CENTER.x, FOLD_CENTER.y)
    ).toBe(true);

    const centralLeft = findBoardAtLayer(result.boards, 11);
    expect(centralLeft).toBeDefined();
    if (!centralLeft) return;
    expect(containsPoint(centralLeft.polygon, TIP_FINAL.x, TIP_FINAL.y)).toBe(
      true
    );
    expect(containsPoint(centralLeft.polygon, P_LEFT.x, P_LEFT.y)).toBe(true);

    // サイド片はかぶせ折りで内側へ畳まれた後持ち上がり、中央片の真裏に重なる
    const sideRight = findBoardAtLayer(result.boards, 10);
    expect(sideRight).toBeDefined();
    if (!sideRight) return;
    expect(containsPoint(sideRight.polygon, TIP_FINAL.x, TIP_FINAL.y)).toBe(
      true
    );
    expect(containsPoint(sideRight.polygon, P_RIGHT.x, P_RIGHT.y)).toBe(true);
    expect(
      containsPoint(sideRight.polygon, FOLD_CENTER.x, FOLD_CENTER.y)
    ).toBe(true);

    const sideLeft = findBoardAtLayer(result.boards, 9);
    expect(sideLeft).toBeDefined();
    if (!sideLeft) return;
    expect(containsPoint(sideLeft.polygon, P_LEFT.x, P_LEFT.y)).toBe(true);

    // 相方の耳片はかぶせ折り線で内側へ畳まれる（先端Vは動かない）
    const earRight = findBoardAtLayer(result.boards, 8);
    expect(earRight).toBeDefined();
    if (!earRight) return;
    expect(containsPoint(earRight.polygon, 20, -20)).toBe(true);
    expect(containsPoint(earRight.polygon, P_RIGHT.x, P_RIGHT.y)).toBe(true);
    expect(containsPoint(earRight.polygon, FOLD_CENTER.x, FOLD_CENTER.y)).toBe(
      true
    );
    // 耳の元の角(20,0)はスパイン上のAへ写る（かぶせ折りの成立条件）
    expect(containsPoint(earRight.polygon, 20, 0)).toBe(false);

    const earLeft = findBoardAtLayer(result.boards, 7);
    expect(earLeft).toBeDefined();

    // フラップの固定片（折り線より上）は元のレイヤーに残る
    const upperRight = findBoardAtLayer(result.boards, 6);
    expect(upperRight).toBeDefined();
    if (!upperRight) return;
    expect(containsPoint(upperRight.polygon, 0, 0)).toBe(true);
    expect(containsPoint(upperRight.polygon, P_RIGHT.x, P_RIGHT.y)).toBe(true);
    expect(containsPoint(upperRight.polygon, 20, -20)).toBe(false);

    // 相方の固定片は角が耳として切り離され、スパイン全体を保つ
    const bodyRight = findBoardAtLayer(result.boards, 3);
    expect(bodyRight).toBeDefined();
    if (!bodyRight) return;
    expect(containsPoint(bodyRight.polygon, 0, 0)).toBe(true);
    expect(containsPoint(bodyRight.polygon, 20, -20)).toBe(true);
    expect(containsPoint(bodyRight.polygon, 20, 0)).toBe(false);

    // 対象外の4枚は動かない
    for (const layer of [0, -1, -2, -3]) {
      expect(findBoardAtLayer(result.boards, layer)).toBeDefined();
    }

    // 全頂点がXY平面上（z=0）に保たれる
    expect(
      result.boards.every((board) =>
        board.polygon.every((vertex) => vertex.z === 0)
      )
    ).toBe(true);
  });

  it("sourcePolygonは変換されず、分割された展開図の座標を引き継ぐ", () => {
    const result = applyPetalFoldStep(
      createSquareBaseBoards(),
      createPetalStep()
    );

    expect(result).not.toBeNull();
    if (!result) return;

    // 右の耳片は相方（レイヤー3、展開図は右下領域）から分割される
    const earRight = findBoardAtLayer(result.boards, 8);
    expect(earRight).toBeDefined();
    if (!earRight) return;
    expect(containsPoint(earRight.sourcePolygon, 0, -20)).toBe(true);

    // 右の中央片は前面フラップ（レイヤー6、展開図は左下領域）から分割される
    const centralRight = findBoardAtLayer(result.boards, 12);
    expect(centralRight).toBeDefined();
    if (!centralRight) return;
    expect(containsPoint(centralRight.sourcePolygon, -20, -20)).toBe(true);
  });

  it("アニメーション用に動く6片と正準化された折り線・かぶせ折り線を返す", () => {
    const result = applyPetalFoldStep(
      createSquareBaseBoards(),
      createPetalStep()
    );

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.movingPieces).toHaveLength(6);
    expect(
      result.movingPieces
        .map((moving) => moving.axes.length)
        .sort((a, b) => a - b)
    ).toEqual([1, 1, 1, 1, 2, 2]);

    // サイド片はかぶせ折り線→折り線の順の合成回転
    const sidePieces = result.movingPieces.filter(
      (moving) => moving.axes.length === 2
    );
    for (const sidePiece of sidePieces) {
      expect(containsPoint([sidePiece.axes[0].start], 20, -20)).toBe(true);
    }

    // 折り線はかぶせ折り線との交点間のスパンに正準化される
    const spanPoints = [result.foldLine.start, result.foldLine.end];
    expect(
      spanPoints.some(
        (point) =>
          Math.abs(point.x - P_RIGHT.x) < 1e-6 &&
          Math.abs(point.y - P_RIGHT.y) < 1e-6
      )
    ).toBe(true);
    expect(
      spanPoints.some(
        (point) =>
          Math.abs(point.x - P_LEFT.x) < 1e-6 &&
          Math.abs(point.y - P_LEFT.y) < 1e-6
      )
    ).toBe(true);

    // かぶせ折り線とスパインはドラッグ頂点を始点とするスパン
    for (const kiteLine of result.kiteLines) {
      expect(containsPoint([kiteLine.start], 20, -20)).toBe(true);
    }
    expect(containsPoint([result.spine.start], 20, -20)).toBe(true);
    expect(containsPoint([result.spine.end], 0, 0)).toBe(true);
  });

  it("同じ操作を2回適用しても同じ結果になる（決定的）", () => {
    const boards = createSquareBaseBoards();
    const first = applyPetalFoldStep(boards, createPetalStep());
    const second = applyPetalFoldStep(boards, createPetalStep());

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.boards).toEqual(second?.boards);
  });

  it("裏側から見て花弁折りすると、動く片は下（-Z側）に積まれる", () => {
    const result = applyPetalFoldStep(
      createSquareBaseBoards(),
      createPetalStep({ viewFront: false })
    );

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.boards).toHaveLength(14);

    // 裏面の2枚（レイヤー-3, -2）がフラップになり、動く片は下へ積まれる
    for (const layer of [-4, -5, -6, -7, -8, -9]) {
      expect(findBoardAtLayer(result.boards, layer)).toBeDefined();
    }

    // 表側の前面（レイヤー6, 5）は動かない
    expect(findBoardAtLayer(result.boards, 6)).toBeDefined();
    expect(findBoardAtLayer(result.boards, 5)).toBeDefined();
  });

  it("リプレイの履歴として花弁折りを適用できる", () => {
    const steps: OrigamiStep[] = [
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
      createPetalStep(),
    ];

    const boards = replayFoldSteps(createSquareBoard(40), steps);
    expect(boards).toHaveLength(14);
  });

  it("ドラッグ頂点を持つ板が4枚未満の場合はnullを返す", () => {
    const square = createSquareBoard(40);
    const boards: LayeredBoard[] = [
      {
        polygon: square.map((vertex) => vertex.clone()),
        sourcePolygon: square.map((vertex) => vertex.clone()),
        layer: 0,
      },
    ];

    expect(applyPetalFoldStep(boards, createPetalStep())).toBeNull();
  });

  it("腕がスパインより長く平らに畳めない場合はnullを返す（2回折りの三角形）", () => {
    const steps: FoldStep[] = [
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
    ];
    const boards = replayFoldSteps(createSquareBoard(40), steps);
    expect(boards).toHaveLength(4);

    const step = createPetalStep({
      foldLine: { start: v(0, 0), end: v(20, 0) },
      dragVertex: v(20, 20),
    });

    expect(applyPetalFoldStep(boards, step)).toBeNull();
  });

  it("保存された折り線が正準化された折り線からずれている場合はnullを返す", () => {
    const step = createPetalStep({
      foldLine: { start: v(0, 0), end: v(20, 0) },
    });

    expect(applyPetalFoldStep(createSquareBaseBoards(), step)).toBeNull();
  });
});

describe("buildPetalFoldStep", () => {
  it("大まかなドラッグから正準化された折り線を持つステップを組み立てる", () => {
    // 先端V=(20,-20)を畳み先(-8.28, 8.28)付近へドラッグした想定の折り線
    // （手でのドラッグを模して正準位置から少しずらす）
    const step = buildPetalFoldStep({
      boards: createSquareBaseBoards(),
      midpoint: v(6.5, -5.2),
      direction: v(10, 10.5),
      dragVertex: v(20, -20),
      viewFront: true,
      acceptanceRadius: 8,
    });

    expect(step).not.toBeNull();
    if (!step) return;

    expect(step.kind).toBe("petal");
    expect(step.dragVertex.z).toBe(0);

    // 折り線はドラッグ精度に依存せず正準化される
    const spanPoints = [step.foldLine.start, step.foldLine.end];
    expect(
      spanPoints.some(
        (point) =>
          Math.abs(point.x - P_RIGHT.x) < 1e-6 &&
          Math.abs(point.y - P_RIGHT.y) < 1e-6
      )
    ).toBe(true);
    expect(
      spanPoints.some(
        (point) =>
          Math.abs(point.x - P_LEFT.x) < 1e-6 &&
          Math.abs(point.y - P_LEFT.y) < 1e-6
      )
    ).toBe(true);

    // 組み立てたステップはそのまま適用できる
    expect(applyPetalFoldStep(createSquareBaseBoards(), step)).not.toBeNull();
  });

  it("ドラッグの折り線が正準位置から離れている場合はnullを返す", () => {
    expect(
      buildPetalFoldStep({
        boards: createSquareBaseBoards(),
        midpoint: v(16, -16),
        direction: v(1, 1),
        dragVertex: v(20, -20),
        viewFront: true,
        acceptanceRadius: 8,
      })
    ).toBeNull();
  });

  it("花弁折りの構造がない状態ではnullを返す", () => {
    const square = createSquareBoard(40);
    const boards: LayeredBoard[] = [
      {
        polygon: square.map((vertex) => vertex.clone()),
        sourcePolygon: square.map((vertex) => vertex.clone()),
        layer: 0,
      },
    ];

    expect(
      buildPetalFoldStep({
        boards,
        midpoint: v(5.86, -5.86),
        direction: v(1, 1),
        dragVertex: v(20, -20),
        viewFront: true,
        acceptanceRadius: 8,
      })
    ).toBeNull();
  });
});

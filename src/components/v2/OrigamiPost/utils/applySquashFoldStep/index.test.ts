import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { applySquashFoldStep, buildSquashFoldStep } from "./index";
import { applyFoldStep } from "../applyFoldStep";
import { replayFoldSteps } from "../replayFoldSteps";
import { createSquareBoard } from "../createSquareBoard";
import { Board, FoldStep, LayeredBoard, SquashFoldStep } from "../../types";

const v = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x, y, 0);

/**
 * 一辺40の正方形を対角線で2回折った4層の三角形を作る
 * （鶴の折り始めと同じ状態。頂点(20,20)に4枚の板の頂点が重なる）
 */
const createTwiceFoldedBoards = (): LayeredBoard[] => {
  const steps: FoldStep[] = [
    // 左上の角を対角線(y=x)で折り下ろす
    {
      kind: "fold",
      foldLine: { start: v(-20, -20), end: v(20, 20) },
      dragVertex: v(-20, 20),
      foldCount: 1,
      viewFront: true,
    },
    // 左下の角を対角線(y=-x)で2枚まとめて折る
    {
      kind: "fold",
      foldLine: { start: v(-20, 20), end: v(20, -20) },
      dragVertex: v(-20, -20),
      foldCount: 2,
      viewFront: true,
    },
  ];
  const boards = replayFoldSteps(createSquareBoard(40), steps);
  if (boards.length !== 4) {
    throw new Error("前提の2回折りが成立しませんでした");
  }
  return boards;
};

/** 頂点(20,20)を(20,-20)へドラッグする開いて畳む操作（折り線はy=0） */
const createSquashStep = (
  overrides: Partial<SquashFoldStep> = {}
): SquashFoldStep => ({
  kind: "squash",
  foldLine: { start: v(0, 0), end: v(20, 0) },
  dragVertex: v(20, 20),
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

describe("applySquashFoldStep", () => {
  it("2回折りの三角形から開いて畳むと、フラップが正方形に畳まれた6枚になる", () => {
    const result = applySquashFoldStep(
      createTwiceFoldedBoards(),
      createSquashStep()
    );

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.boards).toHaveLength(6);

    // 手前フラップのドラッグ頂点側は折り線(y=0)で鏡映されて最前面へ
    const frontUpper = findBoardAtLayer(result.boards, 6);
    expect(frontUpper).toBeDefined();
    if (!frontUpper) return;
    expect(containsPoint(frontUpper.polygon, 20, -20)).toBe(true);
    expect(containsPoint(frontUpper.polygon, 20, 0)).toBe(true);
    expect(containsPoint(frontUpper.polygon, 0, 0)).toBe(true);

    // 奥フラップのドラッグ頂点側（開く部分）はその下へ
    const backUpper = findBoardAtLayer(result.boards, 5);
    expect(backUpper).toBeDefined();
    if (!backUpper) return;
    expect(containsPoint(backUpper.polygon, 20, -20)).toBe(true);
    expect(containsPoint(backUpper.polygon, 0, -20)).toBe(true);
    expect(containsPoint(backUpper.polygon, 0, 0)).toBe(true);

    // 奥フラップの反対側はヒンジ(y=-x)で鏡映されてさらにその下へ
    const backLower = findBoardAtLayer(result.boards, 4);
    expect(backLower).toBeDefined();
    if (!backLower) return;
    expect(containsPoint(backLower.polygon, 0, 0)).toBe(true);
    expect(containsPoint(backLower.polygon, 20, -20)).toBe(true);
    expect(containsPoint(backLower.polygon, 0, -20)).toBe(true);

    // 手前フラップの固定片は元のレイヤーのまま
    const frontLower = findBoardAtLayer(result.boards, 3);
    expect(frontLower).toBeDefined();
    if (!frontLower) return;
    expect(containsPoint(frontLower.polygon, 20, 0)).toBe(true);
    expect(containsPoint(frontLower.polygon, 20, -20)).toBe(true);

    // 奥フラップ（レイヤー2）は分割されて消える
    expect(findBoardAtLayer(result.boards, 2)).toBeUndefined();

    // 対象外の板（レイヤー0, 1）は動かない
    const untouched0 = findBoardAtLayer(result.boards, 0);
    const untouched1 = findBoardAtLayer(result.boards, 1);
    expect(untouched0).toBeDefined();
    expect(untouched1).toBeDefined();
    if (!untouched0 || !untouched1) return;
    expect(containsPoint(untouched0.polygon, 20, 20)).toBe(true);
    expect(containsPoint(untouched1.polygon, 20, 20)).toBe(true);

    // 動いた片はドラッグ元の頂点(20,20)を含まない（先端は畳まれている）
    for (const layer of [3, 4, 5, 6]) {
      const board = findBoardAtLayer(result.boards, layer);
      if (!board) continue;
      expect(containsPoint(board.polygon, 20, 20)).toBe(false);
    }

    // 全頂点がXY平面上（z=0）に保たれる
    expect(
      result.boards.every((board) =>
        board.polygon.every((vertex) => vertex.z === 0)
      )
    ).toBe(true);
  });

  it("sourcePolygonは変換されず、分割された展開図の座標を引き継ぐ", () => {
    const result = applySquashFoldStep(
      createTwiceFoldedBoards(),
      createSquashStep()
    );

    expect(result).not.toBeNull();
    if (!result) return;

    // 最前面の片（手前フラップのドラッグ頂点側）の展開図は正方形の左下領域
    const frontUpper = findBoardAtLayer(result.boards, 6);
    expect(frontUpper).toBeDefined();
    if (!frontUpper) return;
    expect(containsPoint(frontUpper.sourcePolygon, -20, -20)).toBe(true);
    expect(containsPoint(frontUpper.sourcePolygon, 0, -20)).toBe(true);
    expect(containsPoint(frontUpper.sourcePolygon, 0, 0)).toBe(true);

    // ヒンジで鏡映される片の展開図は正方形の左上領域
    const backLower = findBoardAtLayer(result.boards, 4);
    expect(backLower).toBeDefined();
    if (!backLower) return;
    expect(containsPoint(backLower.sourcePolygon, -20, 20)).toBe(true);
  });

  it("アニメーション用に動く3片・動かない板・ヒンジ・スパイン端点を返す", () => {
    const result = applySquashFoldStep(
      createTwiceFoldedBoards(),
      createSquashStep()
    );

    expect(result).not.toBeNull();
    if (!result) return;

    // 動く片は3つ（動き方がそれぞれ異なる）
    expect(result.movingPieces).toHaveLength(3);
    expect(result.movingPieces.map((piece) => piece.motion).sort()).toEqual([
      "mirrorFoldLine",
      "mirrorHinge",
      "openRotate",
    ]);

    // 動く片は回転前の座標を持つ（折り線で鏡映される片はドラッグ頂点を含む）
    const mirrorFoldLine = result.movingPieces.find(
      (piece) => piece.motion === "mirrorFoldLine"
    );
    expect(mirrorFoldLine).toBeDefined();
    if (!mirrorFoldLine) return;
    expect(containsPoint(mirrorFoldLine.piece.polygon, 20, 20)).toBe(true);
    expect(containsPoint(mirrorFoldLine.finalPiece.polygon, 20, -20)).toBe(
      true
    );
    expect(mirrorFoldLine.layer).toBe(3);
    expect(mirrorFoldLine.finalLayer).toBe(6);

    // 動かない板は対象外の2枚 + 手前フラップの固定片
    expect(result.staticBoards).toHaveLength(3);

    // ヒンジは折り線とスパイン端点で交わる対角線(y=-x)のスパン
    expect(result.spineApex.x).toBeCloseTo(0);
    expect(result.spineApex.y).toBeCloseTo(0);
    const hingePoints = [result.hinge.start, result.hinge.end];
    expect(
      hingePoints.some(
        (point) =>
          Math.abs(point.x - 0) < 1e-6 && Math.abs(point.y - 0) < 1e-6
      )
    ).toBe(true);
    expect(
      hingePoints.some(
        (point) =>
          Math.abs(point.x - 20) < 1e-6 && Math.abs(point.y - -20) < 1e-6
      )
    ).toBe(true);
  });

  it("同じ操作を2回適用しても同じ結果になる（決定的）", () => {
    const boards = createTwiceFoldedBoards();
    const first = applySquashFoldStep(boards, createSquashStep());
    const second = applySquashFoldStep(boards, createSquashStep());

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.boards).toEqual(second?.boards);
  });

  it("裏側から見て開いて畳むと、動く片は下（-Z側）に積まれる", () => {
    const result = applySquashFoldStep(
      createTwiceFoldedBoards(),
      createSquashStep({ viewFront: false })
    );

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.boards).toHaveLength(6);

    // 裏側の2枚（レイヤー0, 1）がフラップになり、動く片は下へ積まれる
    expect(findBoardAtLayer(result.boards, -1)).toBeDefined();
    expect(findBoardAtLayer(result.boards, -2)).toBeDefined();
    expect(findBoardAtLayer(result.boards, -3)).toBeDefined();

    // 奥フラップ（レイヤー1）は分割されて消え、手前フラップの固定片は残る
    expect(findBoardAtLayer(result.boards, 1)).toBeUndefined();
    expect(findBoardAtLayer(result.boards, 0)).toBeDefined();

    // 表側の2枚（レイヤー2, 3）は動かない
    expect(findBoardAtLayer(result.boards, 2)).toBeDefined();
    expect(findBoardAtLayer(result.boards, 3)).toBeDefined();
  });

  it("ドラッグ頂点を持つ板が2枚未満の場合はnullを返す", () => {
    const square = createSquareBoard(40);
    const boards: LayeredBoard[] = [
      {
        polygon: square.map((vertex) => vertex.clone()),
        sourcePolygon: square.map((vertex) => vertex.clone()),
        layer: 0,
      },
    ];
    const step = createSquashStep({
      foldLine: { start: v(0, -20), end: v(0, 20) },
    });

    expect(applySquashFoldStep(boards, step)).toBeNull();
  });

  it("折り線がスパインの端点を通らない場合はnullを返す（平らに畳めない）", () => {
    const step = createSquashStep({
      foldLine: { start: v(0, 5), end: v(20, 5) },
    });

    expect(applySquashFoldStep(createTwiceFoldedBoards(), step)).toBeNull();
  });

  it("フラップ2枚が折り目でつながっていない場合はnullを返す", () => {
    // 展開図上で離れた（つながっていない）2枚を重ねた状態
    const square = createSquareBoard(40);
    const boards: LayeredBoard[] = [
      {
        polygon: square.map((vertex) => vertex.clone()),
        sourcePolygon: square.map((vertex) => vertex.clone()),
        layer: 0,
      },
      {
        polygon: square.map((vertex) => vertex.clone()),
        sourcePolygon: square.map(
          (vertex) => new THREE.Vector3(vertex.x + 200, vertex.y, 0)
        ),
        layer: 1,
      },
    ];
    const step = createSquashStep({
      foldLine: { start: v(-20, 0), end: v(20, 0) },
    });

    expect(applySquashFoldStep(boards, step)).toBeNull();
  });

  it("奥フラップが固定側の板とつながっていない場合はnullを返す（開く先がない）", () => {
    // 1回折りの2枚（スパインはあるが、奥フラップの先につながる板がない）
    const steps: FoldStep[] = [
      {
        kind: "fold",
        foldLine: { start: v(-20, -20), end: v(20, 20) },
        dragVertex: v(-20, 20),
        foldCount: 1,
        viewFront: true,
      },
    ];
    const boards = replayFoldSteps(createSquareBoard(40), steps);
    expect(boards).toHaveLength(2);

    // スパイン(-20,-20)-(20,20)の端点(-20,-20)を通る折り線でドラッグ
    const step = createSquashStep({
      foldLine: { start: v(-20, -20), end: v(20, 0) },
    });

    expect(applySquashFoldStep(boards, step)).toBeNull();
  });

  it("開いて畳むジェスチャでも通常の折り（2枚・4枚）は引き続き成立する", () => {
    const boards = createTwiceFoldedBoards();
    const createNormalStep = (foldCount: number): FoldStep => ({
      kind: "fold",
      foldLine: { start: v(0, 0), end: v(20, 0) },
      dragVertex: v(20, 20),
      foldCount,
      viewFront: true,
    });

    // 1枚・3枚はスパインが破れるため不成立、2枚・4枚は成立する
    expect(applyFoldStep(boards, createNormalStep(1))).toBeNull();
    expect(applyFoldStep(boards, createNormalStep(2))).not.toBeNull();
    expect(applyFoldStep(boards, createNormalStep(3))).toBeNull();
    expect(applyFoldStep(boards, createNormalStep(4))).not.toBeNull();
  });
});

describe("buildSquashFoldStep", () => {
  it("フラップ2枚を覆う折り線スパンを持つステップを組み立てる", () => {
    const step = buildSquashFoldStep({
      boards: createTwiceFoldedBoards(),
      midpoint: v(20, 0),
      direction: v(-40, 0),
      dragVertex: v(20, 20),
      viewFront: true,
    });

    expect(step).not.toBeNull();
    if (!step) return;

    expect(step.kind).toBe("squash");
    const spanPoints = [step.foldLine.start, step.foldLine.end];
    expect(
      spanPoints.some(
        (point) => Math.abs(point.x) < 1e-6 && Math.abs(point.y) < 1e-6
      )
    ).toBe(true);
    expect(
      spanPoints.some(
        (point) => Math.abs(point.x - 20) < 1e-6 && Math.abs(point.y) < 1e-6
      )
    ).toBe(true);

    // 組み立てたステップはそのまま適用できる
    expect(
      applySquashFoldStep(createTwiceFoldedBoards(), step)
    ).not.toBeNull();
  });

  it("ドラッグ頂点を持つ板が2枚未満の場合はnullを返す", () => {
    const square = createSquareBoard(40);
    const boards: LayeredBoard[] = [
      {
        polygon: square.map((vertex) => vertex.clone()),
        sourcePolygon: square.map((vertex) => vertex.clone()),
        layer: 0,
      },
    ];

    expect(
      buildSquashFoldStep({
        boards,
        midpoint: v(20, 0),
        direction: v(-40, 0),
        dragVertex: v(20, 20),
        viewFront: true,
      })
    ).toBeNull();
  });
});

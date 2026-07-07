import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import * as THREE from "three";
import { useFoldAnimation } from "./index";
import { PendingFold } from "../../index";
import { FoldStep, SquashFoldStep } from "../../types";
import { applySquashFoldStep } from "../../utils/applySquashFoldStep";
import { createMorphBoardMesh } from "../../utils/createMorphBoardMesh";
import { replayFoldSteps } from "../../utils/replayFoldSteps";
import { createSquareBoard } from "../../utils/createSquareBoard";

// requestAnimationFrameを手動で進められるようにフェイク化する
let rafCallbacks: FrameRequestCallback[] = [];

const flushAnimationFrame = (time: number) => {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  callbacks.forEach((callback) => callback(time));
};

/** ピボットGroupの現在の回転角（ラジアン）を取得する */
const getRotationAngle = (group: THREE.Object3D): number =>
  2 * Math.acos(Math.min(1, Math.abs(group.quaternion.w)));

const createPendingFold = (): PendingFold => ({
  kind: "fold",
  step: {
    kind: "fold",
    foldLine: {
      start: new THREE.Vector3(0, -50, 0),
      end: new THREE.Vector3(0, 50, 0),
    },
    dragVertex: new THREE.Vector3(50, 50, 0),
    foldCount: 1,
    viewFront: true,
  },
  movingBoards: [
    {
      polygon: [
        new THREE.Vector3(0, -50, 0),
        new THREE.Vector3(50, -50, 0),
        new THREE.Vector3(50, 50, 0),
        new THREE.Vector3(0, 50, 0),
      ],
      sourcePolygon: [
        new THREE.Vector3(0, -50, 0),
        new THREE.Vector3(50, -50, 0),
        new THREE.Vector3(50, 50, 0),
        new THREE.Vector3(0, 50, 0),
      ],
      layer: 0,
    },
  ],
});

const createScene = () => {
  const scene = new THREE.Scene();

  const pivotGroup = new THREE.Group();
  pivotGroup.name = "board_moving_pivot";
  pivotGroup.position.set(0, -50, 0);
  scene.add(pivotGroup);

  const foldLineObject = new THREE.Group();
  foldLineObject.name = "foldLine";
  scene.add(foldLineObject);

  return { scene, pivotGroup };
};

/**
 * 開いて畳むのアニメーション待ち状態を作る
 * （対角線で2回折った三角形の頂点(20,20)を開いて畳む）
 */
const createSquashScene = () => {
  const foldSteps: FoldStep[] = [
    {
      kind: "fold",
      foldLine: {
        start: new THREE.Vector3(-20, -20, 0),
        end: new THREE.Vector3(20, 20, 0),
      },
      dragVertex: new THREE.Vector3(-20, 20, 0),
      foldCount: 1,
      viewFront: true,
    },
    {
      kind: "fold",
      foldLine: {
        start: new THREE.Vector3(-20, 20, 0),
        end: new THREE.Vector3(20, -20, 0),
      },
      dragVertex: new THREE.Vector3(-20, -20, 0),
      foldCount: 2,
      viewFront: true,
    },
  ];
  const boards = replayFoldSteps(createSquareBoard(40), foldSteps);

  const step: SquashFoldStep = {
    kind: "squash",
    foldLine: {
      start: new THREE.Vector3(0, 0, 0),
      end: new THREE.Vector3(20, 0, 0),
    },
    dragVertex: new THREE.Vector3(20, 20, 0),
    viewFront: true,
  };
  const result = applySquashFoldStep(boards, step);
  if (!result) throw new Error("前提の開いて畳むが成立しませんでした");

  const scene = new THREE.Scene();

  const foldLineObject = new THREE.Group();
  foldLineObject.name = "foldLine";
  scene.add(foldLineObject);

  const hingeLineObject = new THREE.Group();
  hingeLineObject.name = "foldLine_hinge";
  scene.add(hingeLineObject);

  const morphGroups = result.movingPieces.map((moving, index) => {
    const group = createMorphBoardMesh(moving.piece.polygon, "#4A90E2", {
      name: `board_squash_moving_${index}`,
    });
    scene.add(group);
    return group;
  });

  const pendingFold: PendingFold = { kind: "squash", step, result };

  return { scene, morphGroups, pendingFold, result };
};

/** モーフ板の頂点座標を取得する */
const getMorphVertex = (
  group: THREE.Object3D,
  index: number
): THREE.Vector3 => {
  const mesh = group.children.find(
    (child): child is THREE.Mesh => child instanceof THREE.Mesh
  );
  if (!mesh) throw new Error("面メッシュが見つかりませんでした");
  const position = mesh.geometry.getAttribute("position");
  return new THREE.Vector3(
    position.getX(index),
    position.getY(index),
    position.getZ(index)
  );
};

describe("useFoldAnimation", () => {
  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback): number => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      }
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("foldingフェーズでアニメーションが開始され、時間経過で回転が進む", () => {
    const { scene, pivotGroup } = createScene();
    const completeFold = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        pendingFold: createPendingFold(),
        completeFold,
      })
    );

    // 開始フレーム（回転0）
    flushAnimationFrame(0);
    expect(getRotationAngle(pivotGroup)).toBeCloseTo(0);

    // 中間フレーム（duration 800msの半分 → easeInOutCubic(0.5) = 0.5 → 90度）
    flushAnimationFrame(400);
    expect(getRotationAngle(pivotGroup)).toBeCloseTo(Math.PI / 2);
    expect(completeFold).not.toHaveBeenCalled();
  });

  it("アニメーション完了時に180度回転し、折り操作が確定される", () => {
    const { scene, pivotGroup } = createScene();
    const completeFold = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        pendingFold: createPendingFold(),
        completeFold,
      })
    );

    flushAnimationFrame(0);
    flushAnimationFrame(800);

    expect(getRotationAngle(pivotGroup)).toBeCloseTo(Math.PI);
    expect(completeFold).toHaveBeenCalledOnce();
  });

  it("完了時に折り線が削除される", () => {
    const { scene } = createScene();
    const completeFold = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        pendingFold: createPendingFold(),
        completeFold,
      })
    );

    flushAnimationFrame(0);
    flushAnimationFrame(800);

    expect(scene.getObjectByName("foldLine")).toBeUndefined();
  });

  it("idleフェーズではアニメーションを開始しない", () => {
    const { scene } = createScene();
    const completeFold = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "idle",
        pendingFold: null,
        completeFold,
      })
    );

    expect(rafCallbacks).toHaveLength(0);
    expect(completeFold).not.toHaveBeenCalled();
  });

  it("アンマウント時にアニメーションがキャンセルされる", () => {
    const { scene } = createScene();

    const { unmount } = renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        pendingFold: createPendingFold(),
        completeFold: vi.fn(),
      })
    );

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  describe("開いて畳む", () => {
    it("アニメーション中はモーフ板の頂点が持ち上がり、完了時に確定位置へ着地する", () => {
      const { scene, morphGroups, pendingFold, result } = createSquashScene();
      const completeFold = vi.fn();

      renderHook(() =>
        useFoldAnimation({
          sceneRef: { current: scene },
          controlsRef: { current: null },
          foldPhase: "folding",
          pendingFold,
          completeFold,
        })
      );

      flushAnimationFrame(0);

      // 中間フレームでは動く頂点が+Z側へ持ち上がる（表側から折るため）
      flushAnimationFrame(400);
      const liftedVertices = morphGroups.flatMap((group, groupIndex) =>
        result.movingPieces[groupIndex].piece.polygon.map((_, vertexIndex) =>
          getMorphVertex(group, vertexIndex)
        )
      );
      expect(liftedVertices.some((vertex) => vertex.z > 1)).toBe(true);
      expect(completeFold).not.toHaveBeenCalled();

      // 完了フレームでは確定後の座標に一致する
      flushAnimationFrame(800);
      result.movingPieces.forEach((moving, groupIndex) => {
        moving.finalPiece.polygon.forEach((expected, vertexIndex) => {
          const actual = getMorphVertex(morphGroups[groupIndex], vertexIndex);
          expect(actual.x).toBeCloseTo(expected.x, 4);
          expect(actual.y).toBeCloseTo(expected.y, 4);
          expect(actual.z).toBeCloseTo(expected.z, 4);
        });
      });
      expect(completeFold).toHaveBeenCalledOnce();
    });

    it("完了時に折り線とヒンジ線が削除される", () => {
      const { scene, pendingFold } = createSquashScene();

      renderHook(() =>
        useFoldAnimation({
          sceneRef: { current: scene },
          controlsRef: { current: null },
          foldPhase: "folding",
          pendingFold,
          completeFold: vi.fn(),
        })
      );

      flushAnimationFrame(0);
      flushAnimationFrame(800);

      expect(scene.getObjectByName("foldLine")).toBeUndefined();
      expect(scene.getObjectByName("foldLine_hinge")).toBeUndefined();
    });
  });
});

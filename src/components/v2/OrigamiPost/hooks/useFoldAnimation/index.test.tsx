import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import * as THREE from "three";
import { useFoldAnimation } from "./index";
import { PendingFold } from "../../index";

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
  step: {
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
});

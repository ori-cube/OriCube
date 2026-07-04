import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import * as THREE from "three";
import { useFoldAnimation } from "./index";
import { FoldLineState } from "../../index";
import { MovingAndStaticBoards } from "../../utils/selectMovingBoard";

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

const createFoldLineState = (): FoldLineState => ({
  midpoint: new THREE.Vector3(0, 0, 0),
  direction: new THREE.Vector3(0, 1, 0),
  start: new THREE.Vector3(0, -50, 0),
  end: new THREE.Vector3(0, 50, 0),
});

const createFoldBoards = (): MovingAndStaticBoards => ({
  movingBoard: [
    new THREE.Vector3(0, -50, 0),
    new THREE.Vector3(50, -50, 0),
    new THREE.Vector3(50, 50, 0),
    new THREE.Vector3(0, 50, 0),
  ],
  staticBoard: [
    new THREE.Vector3(-50, -50, 0),
    new THREE.Vector3(0, -50, 0),
    new THREE.Vector3(0, 50, 0),
    new THREE.Vector3(-50, 50, 0),
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
    const setFoldPhase = vi.fn();
    const setFoldBoards = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        setFoldPhase,
        foldLineState: createFoldLineState(),
        foldBoards: createFoldBoards(),
        setFoldBoards,
      })
    );

    // 開始フレーム（回転0）
    flushAnimationFrame(0);
    expect(getRotationAngle(pivotGroup)).toBeCloseTo(0);

    // 中間フレーム（duration 800msの半分 → easeInOutCubic(0.5) = 0.5 → 90度）
    flushAnimationFrame(400);
    expect(getRotationAngle(pivotGroup)).toBeCloseTo(Math.PI / 2);
    expect(setFoldPhase).not.toHaveBeenCalled();
  });

  it("アニメーション完了時に180度回転し、foldedフェーズへ遷移する", () => {
    const { scene, pivotGroup } = createScene();
    const setFoldPhase = vi.fn();
    const setFoldBoards = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        setFoldPhase,
        foldLineState: createFoldLineState(),
        foldBoards: createFoldBoards(),
        setFoldBoards,
      })
    );

    flushAnimationFrame(0);
    flushAnimationFrame(800);

    expect(getRotationAngle(pivotGroup)).toBeCloseTo(Math.PI);
    expect(setFoldPhase).toHaveBeenCalledWith("folded");
  });

  it("完了時に折り線が削除され、板が+Zへオフセットされる", () => {
    const { scene, pivotGroup } = createScene();
    const setFoldPhase = vi.fn();
    const setFoldBoards = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        setFoldPhase,
        foldLineState: createFoldLineState(),
        foldBoards: createFoldBoards(),
        setFoldBoards,
      })
    );

    flushAnimationFrame(0);
    flushAnimationFrame(800);

    expect(scene.getObjectByName("foldLine")).toBeUndefined();
    expect(pivotGroup.position.z).toBeGreaterThan(0);
  });

  it("完了時に動く板の頂点座標が折り返し後の位置へ更新される", () => {
    const { scene } = createScene();
    const setFoldPhase = vi.fn();
    const setFoldBoards = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        setFoldPhase,
        foldLineState: createFoldLineState(),
        foldBoards: createFoldBoards(),
        setFoldBoards,
      })
    );

    flushAnimationFrame(0);
    flushAnimationFrame(800);

    expect(setFoldBoards).toHaveBeenCalledOnce();
    const baked: MovingAndStaticBoards = setFoldBoards.mock.calls[0][0];

    // 右半分（x >= 0）が折り返されて左半分（x <= 0）になる
    baked.movingBoard.forEach((vertex) => {
      expect(vertex.x).toBeLessThanOrEqual(1e-6);
      // z-fighting回避のオフセット分だけ浮いている
      expect(vertex.z).toBeGreaterThan(0);
    });
    // 固定される板は変わらない
    expect(baked.staticBoard).toEqual(createFoldBoards().staticBoard);
  });

  it("idleフェーズではアニメーションを開始しない", () => {
    const { scene } = createScene();
    const setFoldPhase = vi.fn();

    renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "idle",
        setFoldPhase,
        foldLineState: null,
        foldBoards: null,
        setFoldBoards: vi.fn(),
      })
    );

    expect(rafCallbacks).toHaveLength(0);
    expect(setFoldPhase).not.toHaveBeenCalled();
  });

  it("アンマウント時にアニメーションがキャンセルされる", () => {
    const { scene } = createScene();

    const { unmount } = renderHook(() =>
      useFoldAnimation({
        sceneRef: { current: scene },
        controlsRef: { current: null },
        foldPhase: "folding",
        setFoldPhase: vi.fn(),
        foldLineState: createFoldLineState(),
        foldBoards: createFoldBoards(),
        setFoldBoards: vi.fn(),
      })
    );

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});

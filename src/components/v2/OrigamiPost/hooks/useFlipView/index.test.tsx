import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as THREE from "three";
import { useFlipView } from "./index";

// requestAnimationFrameを手動で進められるようにフェイク化する
let rafCallbacks: FrameRequestCallback[] = [];

const flushAnimationFrame = (time: number) => {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  callbacks.forEach((callback) => callback(time));
};

const createCamera = (): THREE.PerspectiveCamera => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0, 150);
  return camera;
};

describe("useFlipView", () => {
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

  it("裏返すとカメラがY軸周りに180度回って反対側へ移動する", () => {
    const camera = createCamera();

    const { result } = renderHook(() =>
      useFlipView({
        cameraRef: { current: camera },
        controlsRef: { current: null },
      })
    );

    act(() => result.current.flipView());
    expect(result.current.isFlipping).toBe(true);

    act(() => {
      flushAnimationFrame(0);
      flushAnimationFrame(600);
    });

    expect(camera.position.x).toBeCloseTo(0);
    expect(camera.position.y).toBeCloseTo(0);
    expect(camera.position.z).toBeCloseTo(-150);
    expect(result.current.isFlipping).toBe(false);
  });

  it("もう一度裏返すと表側へ戻る", () => {
    const camera = createCamera();

    const { result } = renderHook(() =>
      useFlipView({
        cameraRef: { current: camera },
        controlsRef: { current: null },
      })
    );

    act(() => result.current.flipView());
    act(() => {
      flushAnimationFrame(0);
      flushAnimationFrame(600);
    });
    act(() => result.current.flipView());
    act(() => {
      flushAnimationFrame(1000);
      flushAnimationFrame(1600);
    });

    expect(camera.position.z).toBeCloseTo(150);
  });

  it("アニメーション中の再実行は無視される", () => {
    const camera = createCamera();

    const { result } = renderHook(() =>
      useFlipView({
        cameraRef: { current: camera },
        controlsRef: { current: null },
      })
    );

    act(() => result.current.flipView());
    act(() => flushAnimationFrame(0));

    // アニメーション途中で再実行しても開始時カウント以上に増えない
    act(() => result.current.flipView());

    act(() => {
      flushAnimationFrame(300);
      flushAnimationFrame(600);
    });

    expect(camera.position.z).toBeCloseTo(-150);
    expect(result.current.isFlipping).toBe(false);
  });

  it("アンマウント時にアニメーションがキャンセルされる", () => {
    const camera = createCamera();

    const { result, unmount } = renderHook(() =>
      useFlipView({
        cameraRef: { current: camera },
        controlsRef: { current: null },
      })
    );

    act(() => result.current.flipView());
    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});

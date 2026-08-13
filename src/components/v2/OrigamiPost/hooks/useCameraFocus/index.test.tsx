import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { useCameraFocus } from "./index";
import { LayeredBoard } from "../../types";

// requestAnimationFrameを手動で進められるようにフェイク化する
let rafCallbacks: FrameRequestCallback[] = [];

const flushAnimationFrame = (time: number) => {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  callbacks.forEach((callback) => callback(time));
};

const createBoard = (vertices: [number, number][]): LayeredBoard => ({
  polygon: vertices.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  sourcePolygon: vertices.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  layer: 0,
});

const createCameraAndControls = () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0, 150);
  const controls = new OrbitControls(camera, document.createElement("canvas"));
  return { camera, controls };
};

describe("useCameraFocus", () => {
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

  it("板群の中心へ回転の中心とカメラが平行移動する", () => {
    const { camera, controls } = createCameraAndControls();
    const boards = [
      createBoard([
        [0, 0],
        [100, 0],
        [100, 50],
        [0, 50],
      ]),
    ];

    renderHook(() =>
      useCameraFocus({
        cameraRef: { current: camera },
        controlsRef: { current: controls },
        currentBoards: boards,
      })
    );

    act(() => {
      flushAnimationFrame(0);
      flushAnimationFrame(400);
    });

    expect(controls.target.x).toBeCloseTo(50);
    expect(controls.target.y).toBeCloseTo(25);
    // カメラも同じ差分だけ動く（純粋な平行移動で向きは変わらない）
    expect(camera.position.x).toBeCloseTo(50);
    expect(camera.position.y).toBeCloseTo(25);
    expect(camera.position.z).toBeCloseTo(150);
  });

  it("中心がすでに一致している場合は視点を動かさない", () => {
    const { camera, controls } = createCameraAndControls();
    const boards = [
      createBoard([
        [-50, -50],
        [50, -50],
        [50, 50],
        [-50, 50],
      ]),
    ];

    renderHook(() =>
      useCameraFocus({
        cameraRef: { current: camera },
        controlsRef: { current: controls },
        currentBoards: boards,
      })
    );

    expect(rafCallbacks).toHaveLength(0);
  });

  it("板群が変わるたびに新しい中心へ追従する", () => {
    const { camera, controls } = createCameraAndControls();
    const firstBoards = [
      createBoard([
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ]),
    ];
    const secondBoards = [
      createBoard([
        [-100, -100],
        [0, -100],
        [0, 0],
        [-100, 0],
      ]),
    ];

    const { rerender } = renderHook(
      ({ boards }) =>
        useCameraFocus({
          cameraRef: { current: camera },
          controlsRef: { current: controls },
          currentBoards: boards,
        }),
      { initialProps: { boards: firstBoards } }
    );

    act(() => {
      flushAnimationFrame(0);
      flushAnimationFrame(400);
    });

    rerender({ boards: secondBoards });

    act(() => {
      flushAnimationFrame(1000);
      flushAnimationFrame(1400);
    });

    expect(controls.target.x).toBeCloseTo(-50);
    expect(controls.target.y).toBeCloseTo(-50);
    expect(camera.position.x).toBeCloseTo(-50);
    expect(camera.position.y).toBeCloseTo(-50);
    expect(camera.position.z).toBeCloseTo(150);
  });
});

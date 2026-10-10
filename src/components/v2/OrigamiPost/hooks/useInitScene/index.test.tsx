import React, { createRef, StrictMode } from "react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { useInitScene } from "./index";

const rendererMocks = vi.hoisted(() => ({
  created: vi.fn(), render: vi.fn(), dispose: vi.fn(), setSize: vi.fn(),
}));
vi.mock("three", async (importOriginal) => {
  const original = await importOriginal<typeof import("three")>();
  return { ...original, WebGLRenderer: class {
    domElement: HTMLCanvasElement;
    constructor({ canvas }: { canvas: HTMLCanvasElement }) {
      this.domElement = canvas;
      rendererMocks.created();
    }
    render = rendererMocks.render;
    dispose = rendererMocks.dispose;
    setSize = rendererMocks.setSize;
    setPixelRatio = vi.fn();
  } };
});

let frames: Map<number, FrameRequestCallback>;
let nextId = 0;
beforeEach(() => {
  vi.clearAllMocks();
  frames = new Map();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const makeRefs = () => ({
  canvasRef: { current: document.createElement("canvas") },
  sceneRef: createRef<THREE.Scene>(),
  cameraRef: createRef<THREE.PerspectiveCamera>(),
  rendererRef: createRef<THREE.WebGLRenderer>(),
  controlsRef: createRef<OrbitControls>(),
  raycasterRef: createRef<THREE.Raycaster>(),
});
const props = { width: 800, height: 600, cameraPosition: { x: 0, y: 0, z: 150 } };

describe("投稿シーンの寿命", () => {
  it("同じ座標の再レンダーやサイズ変更でシーンを作り直さない", () => {
    const refs = makeRefs();
    const hook = renderHook((options) => useInitScene({ ...refs, ...options }), { initialProps: props });
    const scene = refs.sceneRef.current;
    hook.rerender({ ...props, width: 801, cameraPosition: { x: 0, y: 0, z: 150 } });
    expect(refs.sceneRef.current).toBe(scene);
    expect(rendererMocks.created).toHaveBeenCalledTimes(1);
    expect(rendererMocks.setSize).toHaveBeenLastCalledWith(801, 600);
    expect(frames.size).toBe(1);
    hook.unmount();
    expect(frames.size).toBe(0);
  });

  it("画面を離れたら板・操作イベント・描画予約を破棄する", () => {
    const refs = makeRefs();
    const hook = renderHook(() => useInitScene({ ...refs, ...props }));
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    refs.sceneRef.current?.add(new THREE.Mesh(geometry, material));
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const controls = refs.controlsRef.current;
    if (!controls) throw new Error("controls missing");
    const controlsDispose = vi.spyOn(controls, "dispose");
    const requestRender = hook.result.current;
    hook.unmount();
    requestRender();
    expect(frames.size).toBe(0);
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(controlsDispose).toHaveBeenCalledOnce();
    expect(rendererMocks.dispose).toHaveBeenCalledOnce();
    expect(refs.sceneRef.current).toBeNull();
  });

  it("StrictModeの再初期化で古い描画予約を残さない", () => {
    const refs = makeRefs();
    const hook = renderHook(() => useInitScene({ ...refs, ...props }), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });
    expect(rendererMocks.created).toHaveBeenCalledTimes(2);
    expect(rendererMocks.dispose).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);
    hook.unmount();
    expect(frames.size).toBe(0);
    expect(rendererMocks.dispose).toHaveBeenCalledTimes(2);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { createDemandRenderer } from "./demandRenderer";

let callbacks: Map<number, FrameRequestCallback>;
let sequence = 0;
const flush = () => {
  const current = [...callbacks.values()];
  callbacks.clear();
  current.forEach((callback) => callback(0));
};

beforeEach(() => {
  callbacks = new Map();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const setup = () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.z = 150;
  const controls = new OrbitControls(camera, document.createElement("canvas"));
  const render = vi.fn();
  const rendering = createDemandRenderer(controls, render);
  return { controls, render, ...rendering };
};

describe("必要時の描画", () => {
  it("静止すると停止し、複数の変更を1フレームにまとめる", () => {
    const rendering = setup();
    flush();
    expect(callbacks.size).toBe(0);
    rendering.requestRender();
    rendering.requestRender();
    expect(callbacks.size).toBe(1);
    flush();
    flush();
    expect(rendering.render).toHaveBeenCalledTimes(2);
    expect(callbacks.size).toBe(0);
    rendering.dispose();
    rendering.controls.dispose();
  });

  it("視点の変更を描画し、慣性が収まると停止する", () => {
    const rendering = setup();
    flush();
    const update = vi.spyOn(rendering.controls, "update").mockImplementationOnce(() => {
      rendering.controls.dispatchEvent({ type: "change" });
      return true;
    }).mockReturnValue(false);
    rendering.controls.dispatchEvent({ type: "change" });
    flush();
    expect(callbacks.size).toBe(1);
    flush();
    expect(callbacks.size).toBe(0);
    expect(update).toHaveBeenCalledTimes(2);
    rendering.dispose();
    rendering.controls.dispose();
  });

  it("タブを隠すと予約を止め、戻した時に最新の状態を描画する", () => {
    const rendering = setup();
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    rendering.requestRender();
    expect(callbacks.size).toBe(0);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    flush();
    expect(rendering.render).toHaveBeenCalledTimes(1);
    rendering.dispose();
    rendering.controls.dispose();
  });

  it("終了後は残ったコールバックや視点変更でも描画しない", () => {
    const rendering = setup();
    const staleCallbacks = [...callbacks.values()];
    rendering.dispose();
    rendering.controls.dispatchEvent({ type: "change" });
    rendering.requestRender();
    staleCallbacks.forEach((callback) => callback(0));
    expect(callbacks.size).toBe(0);
    expect(rendering.render).not.toHaveBeenCalled();
    rendering.controls.dispose();
  });
});

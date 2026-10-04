import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createViewerScene } from "./scene";
import type { ViewerStep } from "./playback";

const renderer = vi.hoisted(() => ({ render: vi.fn(), dispose: vi.fn(), setSize: vi.fn() }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, WebGLRenderer: class {
    render = renderer.render;
    dispose = renderer.dispose;
    setSize = renderer.setSize;
    setPixelRatio = vi.fn();
  } };
});
const disconnect = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); disconnect = disconnect; });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const step: ViewerStep = {
  kind: "fold", sourceIndex: 0, viewFront: true, label: "折る", fixedBoards: [], settledBoards: [],
  data: {
    kind: "fold", fixBoards: [], foldLines: [],
    moveBoards: [{ polygon: [[0, 0, 0], [20, 0, 0], [0, 20, 0]], layer: 0, vertexAxes: [[], [{ origin: [0, 0, 0], direction: [0, 1, 0] }], []] }],
  },
};

describe("V2閲覧シーン", () => {
  it("進捗で同じメッシュを更新し、停止中に描画ループを作らない", () => {
    const raf = vi.spyOn(globalThis, "requestAnimationFrame");
    const canvas = document.createElement("canvas");
    const container = document.createElement("div");
    const scene = createViewerScene(canvas, container, 100);
    scene.setContent(step, [], "#e85252", true);
    scene.setProgress(0);
    const renderedScene: unknown = renderer.render.mock.calls.at(-1)?.[0];
    expect(renderedScene).toBeInstanceOf(THREE.Scene);
    if (!(renderedScene instanceof THREE.Scene)) throw new Error("Sceneが描画されていません");
    const paper = renderedScene.children.find((child) => child instanceof THREE.Group);
    const board = paper?.children[0];
    const mesh = board?.children[0];
    if (!(mesh instanceof THREE.Mesh)) throw new Error("紙が描画されていません");
    const geometry = mesh.geometry;
    scene.setProgress(0.5);
    expect(mesh.geometry).toBe(geometry);
    expect(geometry.getAttribute("position").getZ(1)).toBeCloseTo(-20);
    expect(raf).not.toHaveBeenCalled();
    scene.dispose();
  });
  it("離脱時にリサイズ監視と描画資源を解放し、後から描画しない", () => {
    const dispose = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
    const scene = createViewerScene(document.createElement("canvas"), document.createElement("div"), 100);
    scene.setContent(step, [], "#e85252", true);
    scene.setProgress(0.5);
    scene.dispose();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledTimes(2);
    const count = renderer.render.mock.calls.length;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(renderer.render).toHaveBeenCalledTimes(count);
  });
});

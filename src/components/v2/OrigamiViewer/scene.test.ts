import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createViewerScene } from "./scene";
import { BOARD_LAYER_OFFSET } from "../OrigamiPost/constants";
import type { FixBoardV2 } from "@/types/model-v2";
import type { ViewerStep } from "./playback";

const renderer = vi.hoisted(() => ({ render: vi.fn(), dispose: vi.fn(), setSize: vi.fn(), setViewport: vi.fn() }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, WebGLRenderer: class {
    render = renderer.render;
    dispose = renderer.dispose;
    setSize = renderer.setSize;
    setViewport = renderer.setViewport;
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
  kind: "fold", sourceIndex: 0, viewFront: true, label: "折る", fixedBoards: [], settledBoards: [], settledFlatBoards: [],
  data: {
    kind: "fold", fixBoards: [], foldLines: [],
    moveBoards: [{ polygon: [[0, 0, 0], [20, 0, 0], [0, 20, 0]], layer: 0, vertexAxes: [[], [{ origin: [0, 0, 0], direction: [0, 1, 0] }], []] }],
  },
};

describe("V2閲覧シーン", () => {
  it("操作パネルの高さが変わっても紙を上下のパネルの間に描画する", () => {
    const container = document.createElement("div");
    Object.defineProperties(container, { clientWidth: { value: 986 }, clientHeight: { value: 881 } });
    const scene = createViewerScene(document.createElement("canvas"), container, 100);
    scene.setInsets({ top: 120, bottom: 150 });
    expect(renderer.setViewport).toHaveBeenLastCalledWith(0, 150, 986, 611);
    scene.setInsets({ top: 220, bottom: 250 });
    expect(renderer.setViewport).toHaveBeenLastCalledWith(0, 250, 986, 411);
    const camera: unknown = renderer.render.mock.calls.at(-1)?.[1];
    if (!(camera instanceof THREE.PerspectiveCamera)) throw new Error("カメラがありません");
    expect(camera.aspect).toBeCloseTo(986 / 411);
    scene.dispose();
  });
  it("表示領域が一時的に縮んでも描画範囲を負にしない", () => {
    const scene = createViewerScene(document.createElement("canvas"), document.createElement("div"), 100);
    scene.setInsets({ top: 220, bottom: 250 });
    expect(renderer.setViewport).toHaveBeenLastCalledWith(0, 0, 1, 1);
    scene.dispose();
  });
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
  it("再度の中割りで狭くなったレイヤーを24bit深度でも区別できる", () => {
    const scene = createViewerScene(document.createElement("canvas"), document.createElement("div"), 100);
    const camera: unknown = renderer.render.mock.calls.at(-1)?.[1];
    if (!(camera instanceof THREE.PerspectiveCamera)) throw new Error("カメラがありません");
    camera.updateMatrixWorld();
    const first = new THREE.Vector3(0, 0, 0).project(camera).z;
    const second = new THREE.Vector3(0, 0, BOARD_LAYER_OFFSET / 81).project(camera).z;
    expect(Math.abs(second - first) / 2).toBeGreaterThan(1 / 2 ** 24);
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
  it("垂直な羽を平面データで三角形分割し、面と重なり順を維持する", () => {
    const scene = createViewerScene(document.createElement("canvas"), document.createElement("div"), 100);
    const flat: FixBoardV2[] = [{ layer: 2, polygon: [[0, 0, 0], [20, 0, 0], [0, 20, 0]] }];
    const posed: FixBoardV2[] = [{ layer: 2, polygon: [[0, 0, 0], [0, 0, -20], [0, 20, 0]] }];
    scene.setContent(undefined, posed, "#ed7070", true, false, true, flat);
    scene.setProgress(0);
    const rendered: unknown = renderer.render.mock.calls.at(-1)?.[0];
    if (!(rendered instanceof THREE.Scene)) throw new Error("Sceneがありません");
    const paper = rendered.children.find((child) => child instanceof THREE.Group);
    const board = paper?.children[0];
    const mesh = board?.children[0];
    if (!(mesh instanceof THREE.Mesh)) throw new Error("羽の面がありません");
    expect(mesh.geometry.index?.count).toBe(3);
    expect(mesh.geometry.getAttribute("position").getZ(1)).toBe(-20);
    expect(board?.position.x).toBeCloseTo(0.1);
    expect(board?.position.z).toBeCloseTo(0);
    scene.dispose();
  });

});

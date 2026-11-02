import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createViewerScene } from "./scene";
import { BOARD_LAYER_OFFSET } from "../OrigamiPost/constants";
import type { FixBoardV2, ViewerStep } from "@oricube/engine";

const renderer = vi.hoisted(() => ({ render: vi.fn(), dispose: vi.fn(), setSize: vi.fn(), setViewport: vi.fn(), setClearColor: vi.fn(), setPixelRatio: vi.fn() }));
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, WebGLRenderer: class {
    render = renderer.render;
    dispose = renderer.dispose;
    setSize = renderer.setSize;
    setViewport = renderer.setViewport;
    setPixelRatio = renderer.setPixelRatio;
    setClearColor = renderer.setClearColor;
    getClearColor = (target: InstanceType<typeof actual.Color>) => target.set(0x000000);
    getClearAlpha = () => 0;
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

/** 作品の置き方（pose）の下にある、板をまとめたグループ */
const paperOf = (scene: THREE.Scene) => scene.children.find((child) => child instanceof THREE.Group)?.children[0];

describe("V2閲覧シーン", () => {
  it("上下を切り取らず、ビュー全体を描画範囲とカメラの縦横比に使う", () => {
    const container = document.createElement("div");
    Object.defineProperties(container, { clientWidth: { value: 986 }, clientHeight: { value: 961 } });
    const scene = createViewerScene(document.createElement("canvas"), container, 100);
    expect(renderer.setViewport).toHaveBeenLastCalledWith(0, 0, 986, 961);
    const camera: unknown = renderer.render.mock.calls.at(-1)?.[1];
    if (!(camera instanceof THREE.PerspectiveCamera)) throw new Error("カメラがありません");
    expect(camera.aspect).toBeCloseTo(986 / 961);
    scene.setZoom(1.25);
    expect(renderer.setViewport).toHaveBeenLastCalledWith(0, 0, 986, 961);
    expect(camera.zoom).toBe(1.25);
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
    const paper = paperOf(renderedScene);
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
    const paper = paperOf(rendered);
    const board = paper?.children[0];
    const mesh = board?.children[0];
    if (!(mesh instanceof THREE.Mesh)) throw new Error("羽の面がありません");
    expect(mesh.geometry.index?.count).toBe(3);
    expect(mesh.geometry.getAttribute("position").getZ(1)).toBe(-20);
    expect(board?.position.x).toBeCloseTo(0.1);
    expect(board?.position.z).toBeCloseTo(0);
    scene.dispose();
  });

  it("作品を見ている方向を軸に画面内で回し、カメラの上下は変えない", () => {
    const scene = createViewerScene(document.createElement("canvas"), document.createElement("div"), 100);
    scene.setContent(undefined, [{ layer: 0, polygon: [[0, 0, 0], [20, 0, 0], [0, 20, 0]] }], "#ed7070", true);
    scene.setProgress(1);
    const [rendered, camera] = renderer.render.mock.calls.at(-1) ?? [];
    if (!(rendered instanceof THREE.Scene) || !(camera instanceof THREE.PerspectiveCamera)) throw new Error("描画されていません");
    const pose = rendered.children.find((child) => child instanceof THREE.Group);
    if (!pose) throw new Error("作品がありません");
    // 正面（+Z）から見て反時計回りに90°回すと、+X の向きが +Y になる
    scene.rotateModel(Math.PI / 2);
    pose.updateMatrixWorld();
    const direction = new THREE.Vector3(1, 0, 0).applyQuaternion(pose.quaternion);
    expect(direction.x).toBeCloseTo(0);
    expect(direction.y).toBeCloseTo(1);
    expect(camera.up.toArray()).toEqual([0, 1, 0]);
    expect(renderer.render.mock.calls.at(-1)?.[0]).toBe(rendered);
    scene.dispose();
  });

  it("斜め上から見ていても水平な軸で回し、作品の上下を真上に合わせられる", () => {
    const scene = createViewerScene(document.createElement("canvas"), document.createElement("div"), 100);
    scene.setContent(undefined, [{ layer: 0, polygon: [[0, 0, 0], [20, 0, 0], [0, 20, 0]] }], "#ed7070", true);
    scene.setCamera("angled");
    scene.rotateModel(Math.PI / 3);
    const [x, y, z, w] = scene.getModelRotation();
    // 回転軸（クォータニオンのベクトル部）が水平
    expect(y).toBeCloseTo(0);
    expect(Math.hypot(x, z)).toBeCloseTo(Math.sin(Math.PI / 6));
    expect(w).toBeCloseTo(Math.cos(Math.PI / 6));
    scene.dispose();
  });

  it("完成形の向きを表示に掛け、回した分はその上に重ねる", () => {
    const scene = createViewerScene(document.createElement("canvas"), document.createElement("div"), 100);
    const quarter: [number, number, number, number] = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
    scene.setContent(undefined, [{ layer: 0, polygon: [[0, 0, 0], [20, 0, 0], [0, 20, 0]] }], "#ed7070", true);
    scene.setFinalRotation(quarter);
    scene.setProgress(1);
    scene.getModelRotation().forEach((value, index) => expect(value).toBeCloseTo(quarter[index]));
    scene.rotateModel(Math.PI / 2);
    // 正面（+Z）から見て、さらに90°回すと180°
    expect(Math.abs(scene.getModelRotation()[2])).toBeCloseTo(1);
    scene.setProgress(1);
    expect(Math.abs(scene.getModelRotation()[2])).toBeCloseTo(1);
    scene.dispose();
  });

  it("完成形の向きに整えるステップは、回転なしから見せる向きへ補間する", () => {
    const scene = createViewerScene(document.createElement("canvas"), document.createElement("div"), 100);
    const boards = [{ layer: 0, polygon: [[0, 0, 0], [20, 0, 0], [0, 20, 0]] as [number, number, number][] }];
    const present: ViewerStep = { kind: "present", boards, flatBoards: boards, viewFront: true, rotation: [0, 0, 1, 0], label: "完成形の向きに整える" };
    scene.setContent(present, boards, "#ed7070", true);
    scene.setProgress(0);
    expect(scene.getModelRotation()[3]).toBeCloseTo(1);
    scene.setProgress(0.5);
    expect(scene.getModelRotation()[2]).toBeCloseTo(Math.SQRT1_2);
    scene.setProgress(1);
    expect(Math.abs(scene.getModelRotation()[2])).toBeCloseTo(1);
    scene.dispose();
  });
});

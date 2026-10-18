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

  it("撮影は今の視点のまま、ビュー中央の正方形を指定の大きさで塗りつぶして画像にし、表示を戻す", async () => {
    const canvas = document.createElement("canvas");
    const container = document.createElement("div");
    // 縦長のビュー。正方形の枠は幅（300px）に合わせる
    Object.defineProperties(container, { clientWidth: { value: 300 }, clientHeight: { value: 600 } });
    const blob = new Blob(["png"], { type: "image/png" });
    const toBlob = vi.fn((callback: BlobCallback) => callback(blob));
    canvas.toBlob = toBlob;
    const scene = createViewerScene(canvas, container, 100);
    scene.rotateCamera(Math.PI / 4, 0);
    const camera: unknown = renderer.render.mock.calls.at(-1)?.[1];
    if (!(camera instanceof THREE.PerspectiveCamera)) throw new Error("カメラがありません");
    const position = camera.position.clone();
    let captured: { aspect: number; fov: number } | undefined;
    renderer.render.mockImplementationOnce((_scene: unknown, used: THREE.PerspectiveCamera) => { captured = { aspect: used.aspect, fov: used.fov }; });

    await expect(scene.capture({ size: 640, background: "#f5f5f5" })).resolves.toBe(blob);

    expect(captured?.aspect).toBe(1);
    // 縦の視野角を枠の幅（高さの半分）に合わせて狭める
    expect(Math.tan(THREE.MathUtils.degToRad(captured?.fov ?? 0) / 2)).toBeCloseTo(Math.tan(THREE.MathUtils.degToRad(35) / 2) / 2);
    expect(renderer.setSize).toHaveBeenCalledWith(640, 640, false);
    expect(renderer.setClearColor).toHaveBeenCalledWith("#f5f5f5", 1);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    // 表示の大きさ・視野角・背景・視点を戻す
    expect(renderer.setSize).toHaveBeenLastCalledWith(300, 600, false);
    expect(renderer.setViewport).toHaveBeenLastCalledWith(0, 0, 300, 600);
    expect(renderer.setClearColor).toHaveBeenLastCalledWith(expect.any(THREE.Color), 0);
    expect(camera.fov).toBe(35);
    expect(camera.aspect).toBeCloseTo(0.5);
    expect(camera.position.distanceTo(position)).toBeCloseTo(0);
    scene.dispose();
  });

  it("画像にできなければ失敗を返す", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = (callback: BlobCallback) => callback(null);
    const scene = createViewerScene(canvas, document.createElement("div"), 100);
    await expect(scene.capture({ size: 640, background: "#ffffff" })).rejects.toThrow("サムネイル");
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
});

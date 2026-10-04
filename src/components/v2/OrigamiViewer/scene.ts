import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import type { FixBoardV2, PointV2 } from "@/types/model-v2";
import { createMorphBoardMesh, updateMorphBoardMeshPositions } from "../OrigamiPost/utils/createMorphBoardMesh";
import { disposeObject3D } from "../OrigamiPost/utils/disposeObject3D";
import { BOARD_LAYER_OFFSET } from "../OrigamiPost/constants";
import { getStepBoards, getViewAngle, type ViewerStep } from "./playback";

export type CameraPreset = "front" | "angled";
const toVector = (point: PointV2) => new THREE.Vector3(...point);

export const createViewerScene = (canvas: HTMLCanvasElement, container: HTMLElement, size: number) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, size / 100, size * 20);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minDistance = size * 0.8;
  controls.maxDistance = size * 8;
  const root = new THREE.Group();
  scene.add(root, new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(size, size, size * 2);
  scene.add(light);
  let disposed = false;
  let meshes: THREE.Group[] = [];
  let foldLines: THREE.Line[] = [];
  let settled = false;
  let currentColor = "#ed7070";
  let step: ViewerStep | undefined;
  let finalBoards: FixBoardV2[] = [];
  let finalViewFront = true;
  let preset: CameraPreset = "front";
  let zoom = 1;
  let distance = size * 2.2;

  const render = () => { if (!disposed && !document.hidden) renderer.render(scene, camera); };
  const resetCamera = () => {
    controls.target.set(0, 0, 0);
    camera.position.set(preset === "angled" ? distance * 0.25 : 0, preset === "angled" ? distance * 0.35 : 0, distance);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    controls.update();
    render();
  };
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    distance = size * 2.2 / Math.min(camera.aspect, 1);
    controls.maxDistance = Math.max(size * 8, distance * 2);
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    resetCamera();
  };
  controls.addEventListener("change", render);
  document.addEventListener("visibilitychange", render);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const clear = () => {
    // 面と枠線がgeometryを共有するため、一度だけ破棄する。
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    root.clear();
    meshes = [];
    foldLines = [];
  };

  const setContent = (nextStep: ViewerStep | undefined, boards: FixBoardV2[], color: string, viewFront: boolean, nextSettled = false, reset = true) => {
    clear();
    step = nextStep;
    settled = nextSettled;
    currentColor = color;
    finalBoards = boards;
    finalViewFront = viewFront;
    const initialBoards = nextStep ? getStepBoards(nextStep, settled ? 1 : 0) : boards;
    meshes = initialBoards.map((board) => {
      const mesh = createMorphBoardMesh(board.polygon.map(toVector), color);
      mesh.position.z = board.layer * BOARD_LAYER_OFFSET;
      root.add(mesh);
      return mesh;
    });
    if (nextStep?.kind === "fold") {
      foldLines = nextStep.data.foldLines.map((line) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([toVector(line.start), toVector(line.end)]);
        const material = new THREE.LineDashedMaterial({ color: 0x222222, dashSize: size / 40, gapSize: size / 80, depthTest: false });
        const mesh = new THREE.Line(geometry, material);
        mesh.computeLineDistances();
        mesh.renderOrder = 1;
        root.add(mesh);
        return mesh;
      });
    }
    if (reset) resetCamera();
  };
  const setProgress = (progress: number) => {
    if (step && settled !== (progress >= 1)) setContent(step, finalBoards, currentColor, finalViewFront, progress >= 1, false);
    const boards = step ? getStepBoards(step, progress) : finalBoards;
    boards.forEach((board, index) => updateMorphBoardMeshPositions(meshes[index], board.polygon.map(toVector)));
    const center = new THREE.Box3().setFromPoints(boards.flatMap((board) => board.polygon.map(toVector))).getCenter(new THREE.Vector3());
    root.rotation.y = -(step ? getViewAngle(step, progress) : finalViewFront ? 0 : Math.PI);
    root.position.copy(center).applyAxisAngle(new THREE.Vector3(0, 1, 0), root.rotation.y).negate();
    foldLines.forEach((line) => { line.visible = progress < 1; });
    render();
  };

  return {
    setContent, setProgress,
    rotateCamera: (horizontal: number, vertical: number) => {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += horizontal;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, 0.05, Math.PI - 0.05);
      camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));
      controls.update();
      render();
    },
    setCamera: (nextPreset: CameraPreset) => { preset = nextPreset; resetCamera(); },
    setZoom: (nextZoom: number) => { zoom = nextZoom; camera.zoom = zoom; camera.updateProjectionMatrix(); render(); },
    resetCamera,
    dispose: () => {
      disposed = true;
      observer.disconnect();
      controls.removeEventListener("change", render);
      document.removeEventListener("visibilitychange", render);
      controls.dispose();
      clear();
      disposeObject3D(scene);
      renderer.dispose();
    },
  };
};

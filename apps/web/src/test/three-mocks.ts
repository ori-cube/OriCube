import { vi } from "vitest";

/**
 * Three.jsライブラリの統一的なモック設定
 * 
 * 3Dコンポーネントのテストで使用する共通のモック設定を提供します。
 * このモックは以下を含みます：
 * - Scene, WebGLRenderer, PerspectiveCamera
 * - 各種ライト（AmbientLight, DirectionalLight）
 * - ジオメトリとマテリアル
 * - OrbitControls
 */

export const mockThree = () => {
  return {
    Scene: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      getObjectByName: vi.fn(),
    })),
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      domElement: document.createElement("canvas"),
      dispose: vi.fn(),
    })),
    PerspectiveCamera: vi.fn(() => ({
      position: { set: vi.fn() },
      lookAt: vi.fn(),
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
    })),
    AmbientLight: vi.fn(() => ({})),
    DirectionalLight: vi.fn(() => ({
      position: { set: vi.fn() },
    })),
    Vector3: vi.fn(() => ({})),
    PlaneGeometry: vi.fn(() => ({})),
    MeshLambertMaterial: vi.fn(() => ({})),
    Mesh: vi.fn(() => ({
      name: "",
      rotation: { x: 0 },
      position: { y: 0 },
    })),
    EdgesGeometry: vi.fn(() => ({})),
    LineBasicMaterial: vi.fn(() => ({})),
    LineSegments: vi.fn(() => ({
      rotation: { x: 0 },
      position: { y: 0 },
    })),
    Group: vi.fn(() => ({
      name: "",
      add: vi.fn(),
    })),
    Raycaster: vi.fn(() => ({
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn(() => []),
    })),
    DoubleSide: 2,
  };
};

export const mockOrbitControls = () => ({
  OrbitControls: vi.fn(() => ({
    enableDamping: false,
    dampingFactor: 0,
    enableRotate: false,
    update: vi.fn(),
  })),
});

/**
 * Three.jsモックを適用するヘルパー関数
 * テストファイルの先頭で呼び出して使用
 */
export const setupThreeMocks = () => {
  vi.mock("three", () => mockThree());
  vi.mock("three/examples/jsm/Addons.js", () => mockOrbitControls());
};
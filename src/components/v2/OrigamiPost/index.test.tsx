import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OrigamiPostV2 } from "./index";

// Three.jsのモック
vi.mock("three", () => ({
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
  DoubleSide: 2,
}));

vi.mock("three/examples/jsm/Addons.js", () => ({
  OrbitControls: vi.fn(() => ({
    enableDamping: false,
    dampingFactor: 0,
    update: vi.fn(),
  })),
}));

describe("OrigamiPostV2", () => {
  it("renders canvas element", () => {
    render(<OrigamiPostV2 />);
    const canvas = screen.getByRole("img", { hidden: true });
    expect(canvas).toBeInTheDocument();
  });

  it("applies custom props", () => {
    const customProps = {
      origamiColor: "#FF0000",
      size: 150,
      width: 1000,
      height: 800,
      cameraPosition: { x: 10, y: 20, z: 30 },
    };

    render(<OrigamiPostV2 {...customProps} />);
    const canvas = screen.getByRole("img", { hidden: true });
    expect(canvas).toBeInTheDocument();
  });

  it("has correct default props", () => {
    render(<OrigamiPostV2 />);
    const canvas = screen.getByRole("img", { hidden: true });
    expect(canvas).toHaveAttribute("id", "origami-canvas");
  });

  it("applies custom styles", () => {
    render(<OrigamiPostV2 width={500} height={400} />);
    const canvas = screen.getByRole("img", { hidden: true });
    expect(canvas).toHaveStyle({ width: "500px", height: "400px" });
  });
});

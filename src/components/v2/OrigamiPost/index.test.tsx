import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OrigamiPostV2 } from "./index";
import { setupThreeMocks } from "@/test/three-mocks";

setupThreeMocks();

// Three.jsの実行をスキップするためのモック
vi.mock("./hooks/useInitScene", () => ({
  useInitScene: vi.fn(() => {}),
}));

vi.mock("./hooks/useDragDrop", () => ({
  useDragDrop: vi.fn(() => {}),
}));

describe("OrigamiPostV2", () => {
  it("renders canvas element", () => {
    render(<OrigamiPostV2 />);
    const canvas = document.querySelector(
      "#origami-canvas"
    ) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("id", "origami-canvas");
  });

  it("applies custom props correctly", () => {
    const customProps = {
      origamiColor: "#FF0000",
      size: 150,
      width: 1000,
      height: 800,
      cameraPosition: { x: 10, y: 20, z: 30 },
    };

    render(<OrigamiPostV2 {...customProps} />);
    const canvas = document.querySelector(
      "#origami-canvas"
    ) as HTMLCanvasElement;

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveStyle({
      width: "1000px",
      height: "800px",
    });
  });

  it("uses default dimensions when not provided", () => {
    render(<OrigamiPostV2 />);
    const canvas = document.querySelector(
      "#origami-canvas"
    ) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
  });
});

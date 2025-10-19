import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OrigamiPostV2 } from "./index";
import { setupThreeMocks } from "@/test/three-mocks";

// Three.jsのモックを設定
setupThreeMocks();

// Three.jsの実行をスキップするためのモック
vi.mock("./hooks/useInitScene", () => ({
  useInitScene: vi.fn(() => {}),
}));

vi.mock("./hooks/useDragDrop", () => ({
  useDragDrop: vi.fn(() => {}),
}));

describe("OrigamiPostV2", () => {
  it("canvasが描画されていること", () => {
    render(<OrigamiPostV2 />);
    const canvas = document.querySelector(
      "#origami-canvas"
    ) as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("id", "origami-canvas");
  });
});

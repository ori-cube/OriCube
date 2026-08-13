import { render, screen, fireEvent } from "@testing-library/react";
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
  useDragDrop: vi.fn(() => ({
    confirmFold: vi.fn(),
    cancelFold: vi.fn(),
  })),
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

  it("カラーピッカーで折り紙の色を変更できること", () => {
    render(<OrigamiPostV2 defaultOrigamiColor="#4a90e2" />);
    const picker = screen.getByLabelText<HTMLInputElement>("折り紙の色");

    expect(picker.value).toBe("#4a90e2");

    fireEvent.change(picker, { target: { value: "#ff0000" } });

    expect(picker.value).toBe("#ff0000");
  });
});

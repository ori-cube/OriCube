import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OrigamiPostV2 } from "./index";
import { setupThreeMocks } from "../../test/three-mocks";

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
    const picker = screen.getByLabelText<HTMLInputElement>("折り紙の色を選択");

    expect(picker.value).toBe("#4a90e2");

    fireEvent.change(picker, { target: { value: "#ff0000" } });

    expect(picker.value).toBe("#ff0000");
  });

  it("コード入力で色を変更でき、空にしても直前の折り紙の色を保持すること", () => {
    render(<OrigamiPostV2 defaultOrigamiColor="#4a90e2" />);
    const input = screen.getByRole("textbox", { name: "折り紙の色" });
    fireEvent.change(input, { target: { value: "#00ff00" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(screen.getByLabelText("折り紙の色を選択")).toHaveValue("#00ff00");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(input).toHaveValue("#00FF00");
    expect(screen.getByLabelText("折り紙の色を選択")).toHaveValue("#00ff00");
  });
});

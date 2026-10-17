import { render, screen } from "@testing-library/react";
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

  it("元に戻す・やり直す・裏返す・回して確認を下端に表示すること", () => {
    render(<OrigamiPostV2 />);
    const group = screen.getByRole("group", { name: "折り操作" });
    expect(group).toContainElement(screen.getByRole("button", { name: "元に戻す" }));
    expect(group).toContainElement(screen.getByRole("button", { name: "やり直す" }));
    expect(group).toContainElement(screen.getByRole("button", { name: "裏返す" }));
    expect(group).toContainElement(screen.getByRole("button", { name: "回して確認" }));
  });
});

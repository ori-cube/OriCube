import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./index";

const renderToolbar = (
  overrides: Partial<React.ComponentProps<typeof Toolbar>> = {}
) => {
  const props = {
    canUndo: true,
    canRedo: true,
    canFlip: true,
    canToggleViewMode: true,
    isViewing: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onFlip: vi.fn(),
    onToggleViewMode: vi.fn(),
    ...overrides,
  };
  render(<Toolbar {...props} />);
  return props;
};

describe("Toolbar", () => {
  it("元に戻す・やり直す・裏返す・回して確認ボタンが表示される", () => {
    renderToolbar();

    expect(
      screen.getByRole("button", { name: "元に戻す" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "やり直す" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "裏返す" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "回して確認" })
    ).toBeInTheDocument();
  });

  it("ボタンを押すと対応する操作が呼ばれる", () => {
    const { onUndo, onRedo, onFlip, onToggleViewMode } = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    fireEvent.click(screen.getByRole("button", { name: "やり直す" }));
    fireEvent.click(screen.getByRole("button", { name: "裏返す" }));
    fireEvent.click(screen.getByRole("button", { name: "回して確認" }));

    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).toHaveBeenCalledOnce();
    expect(onFlip).toHaveBeenCalledOnce();
    expect(onToggleViewMode).toHaveBeenCalledOnce();
  });

  it("操作できない場合はボタンが無効化される", () => {
    renderToolbar({
      canUndo: false,
      canRedo: false,
      canFlip: false,
      canToggleViewMode: false,
    });

    expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "やり直す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "裏返す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "回して確認" })).toBeDisabled();
  });

  it("回して確認中はボタンが押された状態になる", () => {
    renderToolbar({ isViewing: true });

    expect(
      screen.getByRole("button", { name: "回して確認" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("childrenを渡すと裏返す・回して確認の代わりに表示する", () => {
    render(
      <Toolbar
        canUndo={false}
        canRedo={false}
        canFlip={false}
        canToggleViewMode={false}
        isViewing={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onFlip={vi.fn()}
        onToggleViewMode={vi.fn()}
      >
        <p>折り方の選択</p>
      </Toolbar>
    );

    expect(screen.getByText("折り方の選択")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "裏返す" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "元に戻す" })).not.toBeInTheDocument();
  });
});

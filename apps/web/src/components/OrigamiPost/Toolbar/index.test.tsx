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
  it("元に戻す・やり直す・裏返す・ビューモードボタンが表示される", () => {
    renderToolbar();

    expect(
      screen.getByRole("button", { name: "元に戻す" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "やり直す" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "裏返す" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ビューモード" })
    ).toBeInTheDocument();
  });

  it("ボタンを押すと対応する操作が呼ばれる", () => {
    const { onUndo, onRedo, onFlip, onToggleViewMode } = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    fireEvent.click(screen.getByRole("button", { name: "やり直す" }));
    fireEvent.click(screen.getByRole("button", { name: "裏返す" }));
    fireEvent.click(screen.getByRole("button", { name: "ビューモード" }));

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
    expect(screen.getByRole("button", { name: "ビューモード" })).toBeDisabled();
  });

  it("ビューモード中はボタンのラベルが折りに戻るになる", () => {
    renderToolbar({ isViewing: true });

    expect(
      screen.getByRole("button", { name: "折りに戻る" })
    ).toBeInTheDocument();
  });
});

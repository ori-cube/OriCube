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
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onFlip: vi.fn(),
    ...overrides,
  };
  render(<Toolbar {...props} />);
  return props;
};

describe("Toolbar", () => {
  it("元に戻す・やり直す・裏返すボタンが表示される", () => {
    renderToolbar();

    expect(
      screen.getByRole("button", { name: "元に戻す" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "やり直す" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "裏返す" })).toBeInTheDocument();
  });

  it("ボタンを押すと対応する操作が呼ばれる", () => {
    const { onUndo, onRedo, onFlip } = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    fireEvent.click(screen.getByRole("button", { name: "やり直す" }));
    fireEvent.click(screen.getByRole("button", { name: "裏返す" }));

    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).toHaveBeenCalledOnce();
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it("操作できない場合はボタンが無効化される", () => {
    renderToolbar({ canUndo: false, canRedo: false, canFlip: false });

    expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "やり直す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "裏返す" })).toBeDisabled();
  });
});

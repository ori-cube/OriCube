import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./index";

describe("Toolbar", () => {
  it("元に戻す・やり直すボタンが表示される", () => {
    render(
      <Toolbar canUndo={true} canRedo={true} onUndo={vi.fn()} onRedo={vi.fn()} />
    );

    expect(
      screen.getByRole("button", { name: "元に戻す" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "やり直す" })
    ).toBeInTheDocument();
  });

  it("ボタンを押すと対応する操作が呼ばれる", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <Toolbar canUndo={true} canRedo={true} onUndo={onUndo} onRedo={onRedo} />
    );

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    fireEvent.click(screen.getByRole("button", { name: "やり直す" }));

    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).toHaveBeenCalledOnce();
  });

  it("操作できない場合はボタンが無効化される", () => {
    render(
      <Toolbar
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "やり直す" })).toBeDisabled();
  });
});

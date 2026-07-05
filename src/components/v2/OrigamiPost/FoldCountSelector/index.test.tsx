import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FoldCountSelector } from "./index";

describe("FoldCountSelector", () => {
  it("上限までの枚数ボタンと操作ボタンが表示される", () => {
    render(
      <FoldCountSelector
        maxFoldCount={3}
        validCounts={[1, 2, 3]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "折る" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "キャンセル" })
    ).toBeInTheDocument();
  });

  it("デフォルトでは選択できる最小の枚数で折るが確定される", () => {
    const onConfirm = vi.fn();
    render(
      <FoldCountSelector
        maxFoldCount={2}
        validCounts={[1, 2]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith(1);
  });

  it("枚数を選び直してから折るとその枚数で確定される", () => {
    const onConfirm = vi.fn();
    render(
      <FoldCountSelector
        maxFoldCount={3}
        validCounts={[1, 2, 3]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith(2);
  });

  it("折りが成立しない枚数は選択できない", () => {
    render(
      <FoldCountSelector
        maxFoldCount={3}
        validCounts={[1, 3]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "2" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "3" })).toBeEnabled();
  });

  it("キャンセルでonCancelが呼ばれ、onConfirmは呼ばれない", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <FoldCountSelector
        maxFoldCount={2}
        validCounts={[1, 2]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

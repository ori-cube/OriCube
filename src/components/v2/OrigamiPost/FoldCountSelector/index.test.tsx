import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FoldCountSelector } from "./index";

describe("FoldCountSelector", () => {
  it("上限までの枚数ボタンと操作ボタンが表示される", () => {
    render(
      <FoldCountSelector
        maxFoldCount={3}
        validCounts={[1, 2, 3]}
        squashAvailable={false}
        petalAvailable={false}
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
        squashAvailable={false}
        petalAvailable={false}
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
        squashAvailable={false}
        petalAvailable={false}
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
        squashAvailable={false}
        petalAvailable={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "2" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "3" })).toBeEnabled();
  });

  it("開いて畳むが成立する場合のみ選択肢に表示される", () => {
    const { rerender } = render(
      <FoldCountSelector
        maxFoldCount={2}
        validCounts={[1, 2]}
        squashAvailable={false}
        petalAvailable={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "開いて畳む" })
    ).not.toBeInTheDocument();

    rerender(
      <FoldCountSelector
        maxFoldCount={2}
        validCounts={[1, 2]}
        squashAvailable={true}
        petalAvailable={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "開いて畳む" })
    ).toBeInTheDocument();
  });

  it("開いて畳むを選んでから折ると開いて畳むで確定される", () => {
    const onConfirm = vi.fn();
    render(
      <FoldCountSelector
        maxFoldCount={4}
        validCounts={[2, 4]}
        squashAvailable={true}
        petalAvailable={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "開いて畳む" }));
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith("squash");
  });

  it("花弁折りが成立する場合のみ選択肢に表示される", () => {
    const { rerender } = render(
      <FoldCountSelector
        maxFoldCount={2}
        validCounts={[1, 2]}
        squashAvailable={false}
        petalAvailable={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: "花弁折り" })
    ).not.toBeInTheDocument();

    rerender(
      <FoldCountSelector
        maxFoldCount={2}
        validCounts={[1, 2]}
        squashAvailable={false}
        petalAvailable={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "花弁折り" })
    ).toBeInTheDocument();
  });

  it("花弁折りを選んでから折ると花弁折りで確定される", () => {
    const onConfirm = vi.fn();
    render(
      <FoldCountSelector
        maxFoldCount={8}
        validCounts={[2, 4]}
        squashAvailable={true}
        petalAvailable={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "花弁折り" }));
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith("petal");
  });

  it("キャンセルでonCancelが呼ばれ、onConfirmは呼ばれない", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <FoldCountSelector
        maxFoldCount={2}
        validCounts={[1, 2]}
        squashAvailable={false}
        petalAvailable={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

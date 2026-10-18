import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FoldCountSelector } from "./index";

const renderSelector = (
  overrides: Partial<React.ComponentProps<typeof FoldCountSelector>> = {}
) => {
  const props = {
    maxFoldCount: 2,
    validCounts: [1, 2],
    squashAvailable: false,
    petalAvailable: false,
    insideReverseAvailable: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  const view = render(<FoldCountSelector {...props} />);
  return { ...props, ...view };
};

const count = (name: string) =>
  screen.getByRole("radio", { name }) as HTMLButtonElement;

describe("FoldCountSelector", () => {
  it("上限までの枚数と操作ボタンが表示され、「折る」にフォーカスする", () => {
    renderSelector({ maxFoldCount: 3, validCounts: [1, 2, 3] });

    expect(screen.getByRole("radiogroup", { name: "折る枚数（上から）" })).toBeInTheDocument();
    expect(count("1")).toBeInTheDocument();
    expect(count("2")).toBeInTheDocument();
    expect(count("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "折る" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
  });

  it("特別な折り方がない場合は折り方の選択を表示しない", () => {
    renderSelector();

    expect(screen.queryByRole("radiogroup", { name: "折り方" })).not.toBeInTheDocument();
  });

  it("重なりがなく1枚しか折れない場合は枚数を表示せず、角度だけ選べる", () => {
    const { onConfirm } = renderSelector({ maxFoldCount: 1, validCounts: [1] });

    expect(screen.queryByRole("radiogroup", { name: "折る枚数（上から）" })).not.toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "折り角度" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith(1, Math.PI);
  });

  it("デフォルトでは選択できる最小の枚数で折るが確定される", () => {
    const { onConfirm } = renderSelector({ validCounts: [2], maxFoldCount: 2 });

    expect(count("2")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith(2, Math.PI);
  });

  it("枚数を選び直してから折るとその枚数で確定される", () => {
    const { onConfirm } = renderSelector({ maxFoldCount: 3, validCounts: [1, 2, 3] });

    fireEvent.click(count("2"));
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith(2, Math.PI);
  });

  it("折りが成立しない枚数は選択できない", () => {
    renderSelector({ maxFoldCount: 3, validCounts: [1, 3] });

    expect(count("2")).toBeDisabled();
    expect(count("1")).toBeEnabled();
    expect(count("3")).toBeEnabled();
  });

  it.each([
    ["開いて畳む", { squashAvailable: true }, "squash"],
    ["花弁折り", { squashAvailable: true, petalAvailable: true }, "petal"],
    ["中割り折り", { insideReverseAvailable: true }, "insideReverse"],
  ] as const)("%sが成立する場合は折り方として選んで確定できる", (name, available, choice) => {
    const { onConfirm, rerender } = renderSelector();
    expect(screen.queryByRole("radio", { name })).not.toBeInTheDocument();

    rerender(
      <FoldCountSelector
        maxFoldCount={4}
        validCounts={[2, 4]}
        squashAvailable={false}
        petalAvailable={false}
        insideReverseAvailable={false}
        {...available}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("radio", { name }));
    expect(screen.queryByRole("radiogroup", { name: "折る枚数（上から）" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith(choice, Math.PI);
  });

  it("枚数で折れない場合は特別な折り方を初期選択し、枚数での折りは選べない", () => {
    const { onConfirm } = renderSelector({ maxFoldCount: 16, validCounts: [], insideReverseAvailable: true });

    expect(screen.getByRole("radio", { name: "枚数を選んで折る" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "中割り折り" })).toBeChecked();
    expect(screen.queryByRole("slider", { name: "折り角度" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith("insideReverse", Math.PI);
  });

  it("折り角度を下げてから折ると仕上げ角度で確定される", () => {
    const { onConfirm } = renderSelector();

    fireEvent.change(screen.getByRole("slider", { name: "折り角度" }), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: "折る" }));

    expect(onConfirm).toHaveBeenCalledWith(1, (150 * Math.PI) / 180);
  });

  it("キャンセルやEscapeでonCancelが呼ばれ、onConfirmは呼ばれない", () => {
    const { onConfirm, onCancel } = renderSelector();

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "折る" }), { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

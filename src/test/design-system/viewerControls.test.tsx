import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Checkbox, IconButton, Pagination, Slider } from "@oricube/design-system";

describe("閲覧用デザインシステム", () => {
  it("アイコンボタンに操作名とトグル状態を伝え、無効時には操作しない", () => {
    const onPress = vi.fn();
    render(<IconButton icon="RepeatIcon" label="繰り返す" selected isDisabled onPress={onPress} />);
    const button = screen.getByRole("button", { name: "繰り返す" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
  it("ステップの選択と次への移動ができ、最初の前へは無効", () => {
    const onChange = vi.fn();
    render(<Pagination page={1} totalPages={14} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "最後へ" }));
    expect(onChange).toHaveBeenCalledWith(14);
  });
  it("数字を3つに保って前後へ移動し、両端へのボタンも使える", () => {
    function Example() {
      const [page, setPage] = React.useState(1);
      return <Pagination page={page} totalPages={21} onChange={setPage} />;
    }
    render(<Example />);
    const next = screen.getByRole("button", { name: "次へ" });
    const expectPages = (values: number[]) => expect(screen.getAllByRole("button").filter((button) => /^\d+ページ目$/.test(button.getAttribute("aria-label") ?? "")).map((button) => button.textContent)).toEqual(values.map(String));
    expectPages([1, 2, 3]);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByRole("button", { name: "次へ" })).toBe(next);
    expectPages([2, 3, 4]);
    fireEvent.click(next);
    expectPages([3, 4, 5]);
    fireEvent.click(screen.getByRole("button", { name: "最後へ" }));
    expectPages([19, 20, 21]);
    expect(screen.getByRole("button", { name: "最後へ" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "最初へ" }));
    expectPages([1, 2, 3]);
    expect(screen.getByRole("button", { name: "最初へ" })).toBeDisabled();
  });
  it("1・2ページしかない場合も存在するページだけを選べる", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Pagination page={1} totalPages={1} onChange={onChange} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "最後へ" })).toBeDisabled();
    rerender(<Pagination page={1} totalPages={2} onChange={onChange} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "2ページ目" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
  it("チェックボックスを選択・解除でき、無効なら変更できない", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Checkbox label="自動再生" onChange={onChange} />);
    const checkbox = screen.getByRole("checkbox", { name: "自動再生" });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(false);
    rerender(<Checkbox label="自動再生" isDisabled onChange={onChange} />);
    onChange.mockClear();
    expect(checkbox).toBeDisabled();
    fireEvent.click(screen.getByText("自動再生"));
    expect(onChange).not.toHaveBeenCalled();
  });
  it("最後のステップから先には進めない", () => {
    render(<Pagination page={14} totalPages={14} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });
  it("横一列のスライダーも操作名とパーセント表示を保ち、キーボードで調整できる", () => {
    const onChange = vi.fn();
    render(<Slider label="進み具合" layout="inline" defaultValue={50} minValue={0} maxValue={100} formatOptions={{ style: "unit", unit: "percent" }} onChange={onChange} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("slider", { name: "進み具合" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(51);
  });
  it("スライダーはラベルと現在値を持ち、矢印キーで調整できる", () => {
    const onChange = vi.fn();
    render(<Slider label="進み具合" defaultValue={50} minValue={0} maxValue={100} onChange={onChange} />);
    const slider = screen.getByRole("slider", { name: "進み具合" });
    expect(slider).toHaveValue("50");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(51);
  });
});

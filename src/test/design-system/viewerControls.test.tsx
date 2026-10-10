import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IconButton, Pagination, Slider } from "@oricube/design-system";

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
    fireEvent.click(screen.getByRole("button", { name: "14ページ目" }));
    expect(onChange).toHaveBeenCalledWith(14);
  });
  it("最後のステップから先には進めない", () => {
    render(<Pagination page={14} totalPages={14} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
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

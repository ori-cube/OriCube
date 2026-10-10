import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchField, TextArea } from "@oricube/design-system";

describe("入力用デザインシステム", () => {
  it("検索語を入力・クリアでき、入力にフォーカスが戻る", () => {
    const onChange = vi.fn();
    render(<SearchField label="折り紙を検索" hideLabel onChange={onChange} />);
    const input = screen.getByRole("searchbox", { name: "折り紙を検索" });
    fireEvent.change(input, { target: { value: "つる" } });
    expect(onChange).toHaveBeenLastCalledWith("つる");
    fireEvent.click(screen.getByRole("button", { name: "検索をクリア" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });
  it("空の検索はクリアできず、無効な検索には入力できない", () => {
    render(<SearchField label="折り紙を検索" isDisabled />);
    expect(screen.getByRole("searchbox", { name: "折り紙を検索" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "検索をクリア", hidden: true })).toBeDisabled();
  });
  it("折り方の説明に複数行を入力できる", () => {
    const onChange = vi.fn();
    render(<TextArea label="折り方の説明" description="操作を説明してください" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "折り方の説明" });
    fireEvent.change(input, { target: { value: "半分に折る\n裏返す" } });
    expect(onChange).toHaveBeenLastCalledWith("半分に折る\n裏返す");
    expect(input).toHaveAccessibleDescription("操作を説明してください");
  });
  it("説明のエラーを入力に関連付ける", () => {
    render(<TextArea label="折り方の説明" errorMessage="説明を入力してください" />);
    const input = screen.getByRole("textbox", { name: "折り方の説明" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("説明を入力してください");
  });
});

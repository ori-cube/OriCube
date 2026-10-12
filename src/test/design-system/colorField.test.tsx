import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColorField } from "@oricube/design-system";
import { NameAndColorControlPanel } from "@/components/OrigamiPost/NameAndColorControlPanel";
import { useOrigamiColor } from "@/components/OrigamiPost/hooks/useOrigamiColor";

function ControlledField() {
  const [color, setColor] = useState<string | null>("#4a90e2");
  return <ColorField label="色" value={color} onChange={setColor} />;
}

function PostingPanel() {
  const { origamiColor, handleOrigamiColorChange } = useOrigamiColor();
  return (
    <NameAndColorControlPanel
      name="つる"
      handleNameChange={() => {}}
      color={origamiColor}
      handleColorChange={handleOrigamiColorChange}
    />
  );
}

describe("ColorField", () => {
  it("色選択をコード入力に反映し、文字列で通知する", () => {
    const onChange = vi.fn();
    render(<ColorField label="色" defaultValue="#4a90e2" onChange={onChange} />);
    const picker = screen.getByLabelText("色を選択");
    fireEvent.change(picker, { target: { value: "#ff0000" } });
    expect(onChange).toHaveBeenLastCalledWith("#FF0000");
    expect(screen.getByRole("textbox", { name: "色" })).toHaveValue("#FF0000");
    expect(picker).toHaveValue("#ff0000");
  });

  it("コード入力をEnterで確定し、短いコードを6桁へ正規化する", () => {
    render(<ControlledField />);
    const input = screen.getByRole("textbox", { name: "色" });
    fireEvent.change(input, { target: { value: "#0f0" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(input).toHaveValue("#00FF00");
    expect(screen.getByLabelText("色を選択")).toHaveValue("#00ff00");
  });

  it("フォーカスを移すと色を確定し、不完全なコードは直前の色に戻す", () => {
    const onChange = vi.fn();
    render(<ColorField label="色" defaultValue="#4a90e2" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "色" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "#123456" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith("#123456");
    onChange.mockClear();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "#12" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("#123456");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("外部で色が変わると両方の入力に反映する", () => {
    const { rerender } = render(<ColorField label="色" value="#ff0000" />);
    rerender(<ColorField label="色" value="#0000ff" />);
    expect(screen.getByRole("textbox", { name: "色" })).toHaveValue("#0000FF");
    expect(screen.getByLabelText("色を選択")).toHaveValue("#0000ff");
  });

  it("説明を両方の入力に関連付ける", () => {
    render(<ColorField label="色" description="表面の色です。" />);
    for (const input of [screen.getByRole("textbox", { name: "色" }), screen.getByLabelText("色を選択")]) {
      expect(input).toHaveAccessibleDescription("表面の色です。");
    }
  });

  it("無効状態と読み取り専用で色を変更できない", () => {
    const { rerender } = render(<ColorField label="色" isDisabled />);
    expect(screen.getByRole("textbox", { name: "色" })).toBeDisabled();
    expect(screen.getByLabelText("色を選択")).toBeDisabled();
    rerender(<ColorField label="色" isReadOnly />);
    expect(screen.getByRole("textbox", { name: "色" })).toHaveAttribute("readonly");
    expect(screen.getByLabelText("色を選択")).toBeDisabled();
  });

  it("フォームには確定した色を1つ送信する", () => {
    render(<form aria-label="色設定"><ColorField label="色" name="color" /></form>);
    fireEvent.change(screen.getByLabelText("色を選択"), { target: { value: "#123456" } });
    const form = screen.getByRole<HTMLFormElement>("form", { name: "色設定" });
    expect(new FormData(form).getAll("color")).toEqual(["#123456"]);
  });

  it("空にした色をnullで通知する", () => {
    const onChange = vi.fn();
    render(<ColorField label="色" defaultValue="#ff0000" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "色" });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("色を空にしてもフォーム送信を妨げない", () => {
    const onSubmit = vi.fn();
    render(
      <form aria-label="色設定" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <ColorField label="色" name="color" defaultValue="#ff0000" />
      </form>,
    );
    const input = screen.getByRole("textbox", { name: "色" });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input).not.toBeRequired();
    expect(input).toBeValid();
    const form = screen.getByRole<HTMLFormElement>("form", { name: "色設定" });
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(new FormData(form).get("color")).toBe("");
  });
});

describe("投稿画面のColorField", () => {
  it("色選択とコード入力で折り紙の色を変更できる", () => {
    render(<PostingPanel />);
    const input = screen.getByRole("textbox", { name: "色" });
    fireEvent.change(screen.getByLabelText("色を選択"), { target: { value: "#00ff00" } });
    expect(input).toHaveValue("#00FF00");
    fireEvent.change(input, { target: { value: "#0000ff" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(screen.getByLabelText("色を選択")).toHaveValue("#0000ff");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(screen.getByLabelText("色を選択")).toHaveValue("#0000ff");
  });
});

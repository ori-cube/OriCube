import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ColorField, type ColorFieldProps } from "./ColorField";

const meta = {
  title: "Design System/ColorField",
  component: ColorField,
  parameters: { a11y: { test: "error" } },
  args: {
    label: "折り紙の色",
    defaultValue: "#4a90e2",
    onChange: fn(),
  },
  argTypes: {
    label: { description: "両方の入力を説明するラベル。" },
    description: { description: "ラベルの下に表示する入力方法の説明。" },
    value: {
      description: "アプリケーションで管理するRGB色のコード。未入力はnull。",
      control: "text",
      table: { type: { summary: "string | null" } },
    },
    defaultValue: {
      description: "初期値。省略すると黒。未入力から始める場合はnull。",
      control: "text",
      table: { type: { summary: "string | null" }, defaultValue: { summary: "#000000" } },
    },
    onChange: {
      description: "確定した#RRGGBB形式の色、または空入力を表すnullを受け取る。",
      control: false,
      table: { type: { summary: "(color: string | null) => void" } },
    },
    isDisabled: {
      description: "色選択とコード入力を無効にする。",
      control: "boolean",
      table: { type: { summary: "boolean" }, defaultValue: { summary: "false" } },
    },
    isReadOnly: {
      description: "色選択を無効にし、コード入力を読み取り専用にする。",
      control: "boolean",
      table: { type: { summary: "boolean" }, defaultValue: { summary: "false" } },
    },
    name: {
      description: "フォーム送信時のフィールド名。コード入力だけに設定する。",
      control: "text",
      table: { type: { summary: "string" } },
    },
  },
} satisfies Meta<typeof ColorField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "折り紙の色" });
    await userEvent.clear(input);
    await userEvent.type(input, "#00ff00");
    await userEvent.tab();
    await expect(canvas.getByLabelText("折り紙の色を選択")).toHaveValue("#00ff00");
    await expect(args.onChange).toHaveBeenLastCalledWith("#00FF00");
    await userEvent.clear(input);
    await userEvent.tab();
    await expect(input).not.toBeRequired();
    await expect(input).toBeValid();
    await expect(args.onChange).toHaveBeenLastCalledWith(null);
  },
};

function ControlledColorField(props: ColorFieldProps) {
  const [color, setColor] = useState<string | null>("#4a90e2");
  return <ColorField {...props} value={color} onChange={setColor} />;
}

export const Controlled: Story = {
  render: (args) => <ControlledColorField {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "折り紙の色" });
    await userEvent.clear(input);
    await userEvent.type(input, "#f00");
    await userEvent.keyboard("{Enter}");
    await expect(input).toHaveValue("#FF0000");
    await expect(canvas.getByLabelText("折り紙の色を選択")).toHaveValue("#ff0000");
  },
};

export const WithDescription: Story = {
  args: { description: "色見本から選ぶか、色コードを入力してください。" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("textbox")).toHaveAccessibleDescription(args.description);
    await expect(canvas.getByLabelText("折り紙の色を選択")).toHaveAccessibleDescription(args.description);
  },
};

export const Disabled: Story = {
  args: { isDisabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("textbox")).toBeDisabled();
    await expect(canvas.getByLabelText("折り紙の色を選択")).toBeDisabled();
  },
};

export const ReadOnly: Story = {
  args: { isReadOnly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("textbox")).toHaveAttribute("readonly");
    await expect(canvas.getByLabelText("折り紙の色を選択")).toBeDisabled();
  },
};

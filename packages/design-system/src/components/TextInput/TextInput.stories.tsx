import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { TextInput } from "./TextInput";

const meta = {
  title: "Design System/TextInput",
  component: TextInput,
  args: {
    label: "お名前",
    placeholder: "例：山田 太郎",
    onChange: fn(),
  },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "お名前" });
    await expect(input).toHaveAttribute("placeholder", "例：山田 太郎");
  },
};

export const WithDescription: Story = {
  args: {
    description: "全角で入力してください",
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "お名前（必須）" });
    await expect(input).toBeRequired();
  },
};

export const Email: Story = {
  args: {
    label: "メールアドレス",
    type: "email",
    autoComplete: "email",
    inputMode: "email",
    placeholder: "例：taro@example.com",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "メールアドレス" });
    await expect(input).toHaveAttribute("type", "email");
    await expect(input).toHaveAttribute("autocomplete", "email");
    await expect(input).toHaveAttribute("inputmode", "email");
  },
};

export const WithError: Story = {
  args: {
    errorMessage:
      "エラー：お名前が入力されていません。お名前を全角で入力してください。",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: /お名前/ });
    await expect(input).toBeInvalid();
    await expect(input).toHaveAccessibleDescription(
      "エラー：お名前が入力されていません。お名前を全角で入力してください。",
    );
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "お名前" });
    await expect(input).toBeDisabled();
  },
};

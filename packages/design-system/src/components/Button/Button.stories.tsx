import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import * as icons from "../icons";
import { Button } from "./Button";

const iconNames = Object.keys(icons);

const meta = {
  title: "Design System/Button",
  component: Button,
  args: {
    text: "ボタン",
    variant: "primary",
    size: "md",
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: "radio",
      options: ["primary", "secondary"],
    },
    size: {
      control: "radio",
      options: ["sm", "md"],
    },
    prefixIcon: {
      control: "select",
      options: [undefined, ...iconNames],
      table: {
        type: {
          summary: "ButtonIconName",
          detail: iconNames.map((name) => `"${name}"`).join(" | "),
        },
      },
    },
    suffixIcon: {
      control: "select",
      options: [undefined, ...iconNames],
      table: {
        type: {
          summary: "ButtonIconName",
          detail: iconNames.map((name) => `"${name}"`).join(" | "),
        },
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const WithPrefixIcon: Story = {
  args: {
    prefixIcon: "SearchIcon",
    text: "検索",
  },
};

export const WithSuffixIcon: Story = {
  args: {
    suffixIcon: "NextIcon",
    text: "次へ",
  },
};

export const WithBothIcons: Story = {
  args: {
    prefixIcon: "PreviousIcon",
    suffixIcon: "NextIcon",
    text: "再生",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "ボタン" });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

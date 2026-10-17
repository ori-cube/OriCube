import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Popover } from "./Popover";
import { IconButton } from "../IconButton";
import { Checkbox } from "../Checkbox";

const meta = {
  title: "Design System/Popover",
  component: Popover,
  parameters: { layout: "centered" },
  args: { title: "再生の設定", trigger: <IconButton icon="MenuIcon" label="設定" />, children: <Checkbox label="ステップ移動時に自動再生" /> },
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { play: async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "設定" }));
  const dialog = await within(document.body).findByRole("dialog", { name: "再生の設定" });
  await expect(within(dialog).getByRole("checkbox", { name: "ステップ移動時に自動再生" })).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
} };

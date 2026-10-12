import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { IconButton } from "./IconButton";

const meta = { title: "Design System/IconButton", component: IconButton, args: { icon: "PlayIcon", label: "再生", onPress: fn() } } satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { play: async ({ canvasElement, args }) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "再生" }));
  await expect(args.onPress).toHaveBeenCalled();
} };
export const Primary: Story = { args: { variant: "primary" } };
export const Selected: Story = { args: { icon: "RepeatIcon", label: "繰り返す", selected: true } };
export const Disabled: Story = { args: { isDisabled: true } };

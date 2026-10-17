import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { SidePanel } from "./SidePanel";
import { Button } from "../Button";

const meta = {
  title: "Design System/SidePanel",
  component: SidePanel,
  parameters: { layout: "centered" },
  args: { title: "視点", triggerLabel: "視点の操作", children: <Button text="視点をリセット" variant="secondary" /> },
} satisfies Meta<typeof SidePanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collapsed: Story = { play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole("button", { name: "視点の操作" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(trigger);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(canvas.getByRole("button", { name: "視点をリセット" })).toBeVisible();
} };
export const Expanded: Story = { args: { defaultExpanded: true } };

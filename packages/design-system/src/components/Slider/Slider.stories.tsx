import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Slider } from "./Slider";

const meta = { title: "Design System/Slider", component: Slider, args: { label: "折りの進み具合", defaultValue: 0, minValue: 0, maxValue: 100, step: 1, onChange: fn() } } satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { play: async ({ canvasElement, args }) => {
  const slider = within(canvasElement).getByRole("slider", { name: "折りの進み具合" });
  slider.focus();
  await userEvent.keyboard("{ArrowRight}");
  await expect(args.onChange).toHaveBeenCalledWith(1);
} };
export const Halfway: Story = { args: { defaultValue: 50 } };
export const Disabled: Story = { args: { isDisabled: true } };

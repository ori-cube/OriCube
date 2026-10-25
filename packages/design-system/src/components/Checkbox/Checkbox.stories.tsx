import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Checkbox } from "./index";

const meta = { title: "Design System/Checkbox", component: Checkbox, args: { label: "ステップ移動時に自動再生", onChange: fn() } } satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Selected: Story = { args: { defaultSelected: true } };
export const Disabled: Story = { args: { isDisabled: true } };

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchField } from "./SearchField";
const meta = { title: "Design System/SearchField", component: SearchField, args: { label: "折り紙を検索", placeholder: "例：つる" } } satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: "つる" } };
export const HiddenLabel: Story = { args: { hideLabel: true } };
export const Disabled: Story = { args: { defaultValue: "つる", isDisabled: true } };

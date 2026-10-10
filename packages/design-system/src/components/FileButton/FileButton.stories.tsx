import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FileButton } from "./index";

const meta = { title: "Design System/FileButton", component: FileButton, args: { text: "JSONを読み込む", variant: "secondary", acceptedFileTypes: [".json", "application/json"] } } satisfies Meta<typeof FileButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };

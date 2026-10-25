import type { Meta, StoryObj } from "@storybook/react-vite";
import { FloatingPanel } from "./index";
import { Button } from "../Button";

const meta = {
  title: "Design System/FloatingPanel",
  component: FloatingPanel,
  parameters: { layout: "centered" },
  args: { "aria-label": "視点の操作", children: <Button text="視点をリセット" variant="secondary" /> },
} satisfies Meta<typeof FloatingPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

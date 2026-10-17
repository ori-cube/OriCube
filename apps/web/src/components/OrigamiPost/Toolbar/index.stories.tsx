import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toolbar } from "./index";

const meta: Meta<typeof Toolbar> = {
  title: "Components/v2/OrigamiPost/Toolbar",
  component: Toolbar,
  parameters: {
    docs: {
      description: {
        component:
          "キャンバス左上にオーバーレイする操作ツールバーです。Undo / Redo / 裏返すを提供します。",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", height: 160 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onUndo: { action: "undo" },
    onRedo: { action: "redo" },
    onFlip: { action: "flip" },
    onToggleViewMode: { action: "toggleViewMode" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    canUndo: true,
    canRedo: true,
    canFlip: true,
    canToggleViewMode: true,
    isViewing: false,
  },
};

export const AllDisabled: Story = {
  args: {
    canUndo: false,
    canRedo: false,
    canFlip: false,
    canToggleViewMode: false,
    isViewing: false,
  },
};

export const Viewing: Story = {
  args: {
    canUndo: false,
    canRedo: false,
    canFlip: false,
    canToggleViewMode: true,
    isViewing: true,
  },
};

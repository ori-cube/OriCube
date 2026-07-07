import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FoldCountSelector } from "./index";

const meta: Meta<typeof FoldCountSelector> = {
  title: "Components/v2/OrigamiPost/FoldCountSelector",
  component: FoldCountSelector,
  parameters: {
    docs: {
      description: {
        component:
          "折りで頂点が重なり、複数の板を折れる場合に折る枚数を選択するカードです。",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", height: 240 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onConfirm: { action: "confirm" },
    onCancel: { action: "cancel" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    maxFoldCount: 2,
    validCounts: [1, 2],
    squashAvailable: false,
  },
};

export const WithInvalidCount: Story = {
  args: {
    maxFoldCount: 3,
    validCounts: [1, 3],
    squashAvailable: false,
  },
};

export const WithSquash: Story = {
  args: {
    maxFoldCount: 4,
    validCounts: [2, 4],
    squashAvailable: true,
  },
};

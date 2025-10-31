import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrigamiPostV2 } from "./index";

const meta: Meta<typeof OrigamiPostV2> = {
  title: "Components/v2/OrigamiPost",
  component: OrigamiPostV2,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Three.jsを使用して折り紙の初期状態を描画するコンポーネントです。",
      },
    },
  },
  argTypes: {
    origamiColor: {
      control: { type: "color" },
      description: "折り紙の色",
    },
    size: {
      control: { type: "range", min: 50, max: 200, step: 10 },
      description: "折り紙のサイズ",
    },
    cameraPosition: {
      control: { type: "object" },
      description: "カメラの初期位置",
    },
    width: {
      control: { type: "number" },
      description: "カンバスの幅",
    },
    height: {
      control: { type: "number" },
      description: "カンバスの高さ",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    origamiColor: "#4A90E2",
    size: 100,
    cameraPosition: { x: 0, y: 0, z: 150 },
    width: 800,
    height: 600,
  },
};

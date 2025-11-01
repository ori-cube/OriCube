import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrigamiDetailV2 } from "./index";
import { Procedure } from "@/types/model";

// トラックの手順6のデータ
const trackStep6: Procedure = {
  "6": {
    description: "上部分を山折りする。",
    fixBoards: [
      [
        [20, 6.666666666666667, 0],
        [20, -13.333333333333334, 0],
        [-20, -13.333333333333334, 0],
        [-20, 6.666666666666667, 0],
      ],
      [
        [4, -6.666666666666667, 0.001],
        [-4, -6.666666666666667, 0.001],
        [-20, -13.333333333333334, 0.001],
        [20, -13.333333333333334, 0.001],
      ],
      [
        [20, -13.333333333333334, 0.002],
        [15.266272189349113, -18.0276134122288, 0.002],
        [4, -6.666666666666667, 0.002],
      ],
      [
        [-20, -13.333333333333334, 0.002],
        [-4, -6.666666666666667, 0.002],
        [-15.266272189349113, -18.0276134122288, 0.002],
      ],
    ],
    moveBoards: [
      [
        [20, 20, 0],
        [20, 6.666666666666667, 0],
        [-20, 6.666666666666667, 0],
        [-20, 20, 0],
      ],
    ],
    rotateAxis: [
      [-20, 6.666666666666667, 0],
      [20, 6.666666666666667, 0],
    ],
    type: "Base",
    initialBoards: [],
    selectedPoints: [],
    rightBoards: [],
    leftBoards: [],
    isMoveBoardsRight: false,
    numberOfMoveBoards: 0,
    maxNumberOfMoveBoards: 0,
    isFoldingDirectionFront: false,
    foldingAngle: 0,
  },
};

const meta: Meta<typeof OrigamiDetailV2> = {
  title: "Components/v2/OrigamiDetail",
  component: OrigamiDetailV2,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    color: {
      control: { type: "color" },
      description: "折り紙の色",
    },
    procedureIndex: {
      control: { type: "number", min: 1, max: 8 },
      description: "手順の番号",
    },
    cameraPreset: {
      control: { type: "inline-radio" },
      options: ["front", "angled"],
      description: "カメラの初期角度",
    },
    showShadow: {
      control: { type: "boolean" },
      description: "影と床の表示",
    },
    floorOrientation: {
      control: { type: "inline-radio" },
      options: ["vertical", "parallel"],
      description: "床の方向",
    },
    floorColor: {
      control: { type: "color" },
      description: "床の色（影ありの場合）",
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  procedure: trackStep6,
  color: "#FF6B6B",
  procedureIndex: 6,
  floorColor: "#f5f5f5",
} as const;

export const FrontShadowVertical: Story = {
  args: {
    ...baseArgs,
    cameraPreset: "front",
    showShadow: true,
    floorOrientation: "vertical",
  },
};

export const FrontShadowParallel: Story = {
  args: {
    ...baseArgs,
    cameraPreset: "front",
    showShadow: true,
    floorOrientation: "parallel",
  },
};

export const FrontNoShadow: Story = {
  args: {
    ...baseArgs,
    cameraPreset: "front",
    showShadow: false,
  },
};

export const AngledShadowVertical: Story = {
  args: {
    ...baseArgs,
    cameraPreset: "angled",
    showShadow: true,
    floorOrientation: "vertical",
  },
};

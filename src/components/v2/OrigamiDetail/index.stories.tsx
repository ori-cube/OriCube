import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useRef, useState } from "react";
import { OrigamiDetailV2 } from "./index";
import { Procedure } from "@/types/model";

// トラックの手順5のデータ
const trackStep5: Procedure = {
  "5": {
    description: "端っこをちょっと折る。",
    fixBoards: [
      [
        [20, 20, 0],
        [20, -13.333333333333334, 0],
        [-20, -13.333333333333334, 0],
        [-20, 20, 0],
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
    ],
    moveBoards: [
      [
        [-4, -6.666666666666667, 0.001],
        [-20, -6.666666666666667, 0.001],
        [-20, -13.333333333333334, 0.001],
      ],
    ],
    rotateAxis: [
      [-4, -6.666666666666667, 0.001],
      [-20, -13.333333333333334, 0.001],
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
  procedure: trackStep5,
  color: "#FF6B6B",
  procedureIndex: 5,
  floorColor: "#f5f5f5",
  autoFoldSpeed: 0.01,
} as const;

type AutoFoldStoryProps = React.ComponentProps<typeof OrigamiDetailV2> & {
  autoFoldSpeed?: number;
};

const AutoFoldStory: React.FC<AutoFoldStoryProps> = ({
  autoFoldSpeed = 0.01,
  ...rest
}) => {
  const [progress, setProgress] = useState(0);
  const directionRef = useRef(1);

  useEffect(() => {
    let frameId = 0;

    const loop = () => {
      setProgress((prev) => {
        let next = prev + directionRef.current * autoFoldSpeed;
        if (next >= 1) {
          next = 1;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        return next;
      });
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [autoFoldSpeed]);

  return <OrigamiDetailV2 {...rest} foldProgress={progress} />;
};

export const FrontShadowVertical: Story = {
  args: {
    ...baseArgs,
    cameraPreset: "front",
    showShadow: true,
    floorOrientation: "vertical",
  },
  render: (args) => <AutoFoldStory {...args} />,
};

export const FrontShadowParallel: Story = {
  args: {
    ...baseArgs,
    cameraPreset: "front",
    showShadow: true,
    floorOrientation: "parallel",
  },
  render: (args) => <AutoFoldStory {...args} />,
};

export const FrontNoShadow: Story = {
  args: {
    ...baseArgs,
    cameraPreset: "front",
    showShadow: false,
  },
  render: (args) => <AutoFoldStory {...args} />,
};

export const AngledShadowVertical: Story = {
  args: {
    ...baseArgs,
    cameraPreset: "angled",
    showShadow: true,
    floorOrientation: "vertical",
  },
  render: (args) => <AutoFoldStory {...args} />,
};

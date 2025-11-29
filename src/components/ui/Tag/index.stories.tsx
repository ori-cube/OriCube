import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tag } from "./index";
import { ColorStyle } from "@/types/model";

const colorStyleOptions: ColorStyle[] = [
  "purple-blue",
  "pink-red",
  "blue-cyan",
  "green-cyan",
  "pink-yellow",
  "beige-peach",
];

const meta: Meta<typeof Tag> = {
  title: "Components/UI/Tag",
  component: Tag,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "タグのテキスト",
    },
    colorStyle: {
      control: "select",
      options: colorStyleOptions,
      description: "タグの色スタイル",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "サンプルタグ",
    colorStyle: "blue-cyan",
  },
};

export const PurpleBlue: Story = {
  args: {
    title: "紫色のグラデーション",
    colorStyle: "purple-blue",
  },
};

export const PinkRed: Story = {
  args: {
    title: "ピンクから赤のグラデーション",
    colorStyle: "pink-red",
  },
};

export const BlueCyan: Story = {
  args: {
    title: "青から水色のグラデーション",
    colorStyle: "blue-cyan",
  },
};

export const GreenCyan: Story = {
  args: {
    title: "緑から水色のグラデーション",
    colorStyle: "green-cyan",
  },
};

export const PinkYellow: Story = {
  args: {
    title: "ピンクから黄色のグラデーション",
    colorStyle: "pink-yellow",
  },
};

export const BeigePeach: Story = {
  args: {
    title: "ベージュからピーチのグラデーション",
    colorStyle: "beige-peach",
  },
};

export const LongText: Story = {
  args: {
    title: "とても長いタグのテキストを表示するテストケース",
    colorStyle: "purple-blue",
  },
};

export const ShortText: Story = {
  args: {
    title: "短",
    colorStyle: "pink-red",
  },
};

// すべての色スタイルを一覧表示
export const AllColorStyles: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      <Tag title="初心者向け" colorStyle="blue-cyan" />
      <Tag title="楽しい" colorStyle="green-cyan" />
      <Tag title="上級者向け" colorStyle="pink-yellow" />
      <Tag title="可愛い" colorStyle="pink-red" />
      <Tag title="伝統的" colorStyle="purple-blue" />
      <Tag title="季節感" colorStyle="beige-peach" />
    </div>
  ),
};

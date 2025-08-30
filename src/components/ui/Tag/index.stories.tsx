import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tag } from "./index";

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
      options: ["purple-blue", "red-pink", "green", "blue", "orange", "yellow"],
      description: "タグの色スタイル",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "サンプルタグ",
    colorStyle: "green",
  },
};

export const PurpleBlue: Story = {
  args: {
    title: "紫から青のグラデーション",
    colorStyle: "purple-blue",
  },
};

export const RedPink: Story = {
  args: {
    title: "赤からピンクのグラデーション",
    colorStyle: "red-pink",
  },
};

export const Green: Story = {
  args: {
    title: "緑のグラデーション",
    colorStyle: "green",
  },
};

export const Blue: Story = {
  args: {
    title: "青のグラデーション",
    colorStyle: "blue",
  },
};

export const Orange: Story = {
  args: {
    title: "オレンジのグラデーション",
    colorStyle: "orange",
  },
};

export const Yellow: Story = {
  args: {
    title: "黄色のグラデーション",
    colorStyle: "yellow",
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
    colorStyle: "red-pink",
  },
};

// すべての色スタイルを一覧表示
export const AllColorStyles: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      <Tag title="初心者向け" colorStyle="green" />
      <Tag title="楽しい" colorStyle="blue" />
      <Tag title="上級者向け" colorStyle="orange" />
      <Tag title="可愛い" colorStyle="red-pink" />
      <Tag title="伝統的" colorStyle="purple-blue" />
      <Tag title="季節感" colorStyle="yellow" />
    </div>
  ),
};

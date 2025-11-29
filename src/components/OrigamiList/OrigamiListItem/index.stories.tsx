import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrigamiListItem } from "./index";
import { Model } from "@/types/model";

const meta: Meta<typeof OrigamiListItem> = {
  title: "Components/OrigamiList/OrigamiListItem",
  component: OrigamiListItem,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    difficulty: {
      control: { type: "range", min: 0, max: 5, step: 1 },
      description: "難易度（0-5、0は未設定）",
    },
    tags: {
      control: "object",
      description: "タグの配列",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な折り紙アイテム
const baseModel: Omit<Model, "searchKeyWord" | "procedure" | "color"> = {
  id: "sample-1",
  name: "鶴",
  imageUrl: "/origami/open.png",
  difficulty: 3,
  tags: [
    { title: "初心者向け", colorStyle: "blue-cyan" },
    { title: "伝統的", colorStyle: "green-cyan" },
  ],
};

export const Default: Story = {
  args: baseModel,
};

// オプショナルフィールドなし（DB実装前の状態）
export const WithoutOptionalFields: Story = {
  args: {
    id: "sample-0",
    name: "基本的な折り紙",
    imageUrl: "/origami/open.png",
  },
};

// 難易度0（未設定）
export const DifficultyNotSet: Story = {
  args: {
    ...baseModel,
    id: "sample-0-difficulty",
    name: "難易度未設定の折り紙",
    difficulty: 0,
    tags: [{ title: "未設定", colorStyle: "beige-peach" }],
  },
};

// 難易度1（初心者向け）
export const Beginner: Story = {
  args: {
    ...baseModel,
    id: "sample-2",
    name: "紙飛行機",
    difficulty: 1,
    tags: [
      { title: "初心者でも出来る", colorStyle: "purple-blue" },
      { title: "小学生にもおすすめ", colorStyle: "pink-red" },
    ],
  },
};

// 難易度5（上級者向け）
export const Advanced: Story = {
  args: {
    ...baseModel,
    id: "sample-3",
    name: "複雑な花",
    difficulty: 5,
    tags: [
      { title: "上級者向け", colorStyle: "pink-yellow" },
      { title: "時間がかかる", colorStyle: "beige-peach" },
      { title: "達成感あり", colorStyle: "blue-cyan" },
    ],
  },
};

// タグなし
export const NoTags: Story = {
  args: {
    ...baseModel,
    id: "sample-4",
    name: "シンプルな箱",
    difficulty: 2,
    tags: [],
  },
};

// 多くのタグ
export const ManyTags: Story = {
  args: {
    ...baseModel,
    id: "sample-5",
    name: "動物の顔",
    difficulty: 4,
    tags: [
      { title: "可愛い", colorStyle: "pink-red" },
      { title: "子供に人気", colorStyle: "green-cyan" },
      { title: "プレゼントに", colorStyle: "blue-cyan" },
      { title: "季節感", colorStyle: "pink-yellow" },
      { title: "インテリア", colorStyle: "purple-blue" },
    ],
  },
};

// 長い名前
export const LongName: Story = {
  args: {
    ...baseModel,
    id: "sample-6",
    name: "とても長い折り紙作品の名前を表示するテストケース",
    difficulty: 3,
    tags: [{ title: "テスト用", colorStyle: "blue-cyan" }],
  },
};

// 画像なし
export const NoImage: Story = {
  args: {
    ...baseModel,
    id: "sample-7",
    name: "画像なしの作品",
    imageUrl: "",
    difficulty: 2,
    tags: [{ title: "画像なし", colorStyle: "green-cyan" }],
  },
};

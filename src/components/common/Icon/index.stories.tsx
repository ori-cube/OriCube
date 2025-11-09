import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowBottom,
  Search,
  Menu,
  Google,
  Play,
  Stop,
  RepeatStop,
  Close,
  Repeat,
} from "./index";

const iconComponents = {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowBottom,
  Search,
  Menu,
  Google,
  Play,
  Stop,
  RepeatStop,
  Close,
  Repeat,
};

const meta: Meta = {
  title: "Components/Common/Icon",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Figmaデザインシステムから取得したアイコンコンポーネントです。",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllIcons: Story = {
  render: () => {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "24px",
          padding: "24px",
        }}
      >
        {Object.entries(iconComponents).map(([name, IconComponent]) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <IconComponent size={32} />
            <span style={{ fontSize: "12px", color: "#666" }}>{name}</span>
          </div>
        ))}
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => {
    const sizes = [16, 20, 24, 32, 40, 48];
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "24px",
        }}
      >
        {sizes.map((size) => (
          <div
            key={size}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Search size={size} />
            <span style={{ fontSize: "12px", color: "#666" }}>{size}px</span>
          </div>
        ))}
      </div>
    );
  },
};

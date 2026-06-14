import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentType } from "react";
import * as Icons from "./index";
import type { IconProps } from "./Icon.types";

type IconEntry = [name: string, Component: ComponentType<IconProps>];

const iconEntries = Object.entries(Icons as Record<string, ComponentType<IconProps>>).filter(
  ([name]) => name.endsWith("Icon"),
) as IconEntry[];

const iconMap = Object.fromEntries(iconEntries) as Record<string, ComponentType<IconProps>>;
const iconNames = iconEntries.map(([name]) => name);

const sizes = [16, 24, 32] as const;

type SingleIconArgs = IconProps & {
  name: string;
  color: string;
};

function SingleIcon({ name, color, size, ...props }: SingleIconArgs) {
  const Icon = iconMap[name];
  if (!Icon) {
    return <p style={{ fontFamily: "sans-serif" }}>アイコン {name} が見つかりません。</p>;
  }
  return (
    <div style={{ color, display: "inline-flex" }}>
      <Icon size={size} {...props} />
    </div>
  );
}

function Gallery() {
  if (iconEntries.length === 0) {
    return (
      <p style={{ fontFamily: "sans-serif" }}>
        アイコンがまだ生成されていません。
        <code>pnpm --filter @oricube/design-system sync-icons</code> を実行してください。
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 16,
        fontFamily: "sans-serif",
      }}
    >
      {iconEntries.map(([name, Icon]) => (
        <div
          key={name}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, color: "#111" }}>
            {sizes.map((size) => (
              <Icon key={size} size={size} aria-hidden />
            ))}
          </div>
          <code style={{ fontSize: 12 }}>{name}</code>
        </div>
      ))}
    </div>
  );
}

const meta: Meta<typeof SingleIcon> = {
  title: "Design System/Icons",
  component: SingleIcon,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    name: {
      control: { type: "select" },
      options: iconNames,
      description: "表示するアイコン",
    },
    size: {
      control: { type: "number", min: 8, max: 128, step: 1 },
      description: "アイコンのサイズ(px)。number または string を指定可能",
    },
    color: {
      control: { type: "color" },
      description: "アイコンの色 (currentColor を参照)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof SingleIcon>;

export const Default: Story = {
  args: {
    name: iconNames[0] ?? "",
    size: 24,
    color: "#111111",
  },
};

export const AllIcons: StoryObj<typeof Gallery> = {
  render: () => <Gallery />,
};

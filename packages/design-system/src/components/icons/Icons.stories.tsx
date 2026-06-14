import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentType } from "react";
import * as Icons from "./index";
import type { IconProps } from "./Icon.types";

type IconEntry = [name: string, Component: ComponentType<IconProps>];

const entries = Object.entries(Icons as Record<string, ComponentType<IconProps>>).filter(
  ([name]) => name.endsWith("Icon"),
) as IconEntry[];

const sizes = [16, 24, 32] as const;

function Gallery() {
  if (entries.length === 0) {
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
      {entries.map(([name, Icon]) => (
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

const meta: Meta<typeof Gallery> = {
  title: "Design System/Icons",
  component: Gallery,
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof Gallery>;

export const AllIcons: Story = {};

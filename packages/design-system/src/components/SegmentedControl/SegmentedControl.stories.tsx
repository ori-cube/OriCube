import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl";

type Count = "1" | "2" | "3" | "4";

function Controlled(props: SegmentedControlProps<Count>) {
  const [value, setValue] = useState(props.value);
  return <SegmentedControl {...props} value={value} onChange={(next) => { setValue(next); props.onChange(next); }} />;
}

const meta = {
  title: "Design System/SegmentedControl",
  component: SegmentedControl,
  render: (args) => <Controlled {...(args as SegmentedControlProps<Count>)} />,
  args: {
    label: "折る枚数",
    value: "1",
    onChange: fn(),
    items: [{ id: "1", label: "1" }, { id: "2", label: "2" }, { id: "3", label: "3", isDisabled: true }, { id: "4", label: "4" }],
  },
} satisfies Meta<SegmentedControlProps<Count>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { play: async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("radio", { name: "2" }));
  await expect(args.onChange).toHaveBeenLastCalledWith("2");
  await expect(canvas.getByRole("radio", { name: "2" })).toBeChecked();
  await expect(canvas.getByRole("radio", { name: "3" })).toBeDisabled();
} };
export const Labels: Story = { args: { label: "折り方", value: "1", items: [{ id: "1", label: "枚数を選んで折る" }, { id: "2", label: "開いて畳む" }, { id: "3", label: "花弁折り" }, { id: "4", label: "中割り折り" }] } };

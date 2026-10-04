import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { Pagination, type PaginationProps } from "./Pagination";

function Example(props: PaginationProps) {
  const [page, setPage] = useState(props.page);
  return <Pagination {...props} page={page} onChange={setPage} />;
}
const meta = { title: "Design System/Pagination", component: Pagination, args: { page: 1, totalPages: 14, onChange: fn() }, render: (args) => <Example {...args} /> } satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;
export const First: Story = {};
export const Middle: Story = { args: { page: 7 } };
export const Last: Story = { args: { page: 14 } };
export const Single: Story = { args: { totalPages: 1 } };
export const Empty: Story = { args: { totalPages: 0 } };

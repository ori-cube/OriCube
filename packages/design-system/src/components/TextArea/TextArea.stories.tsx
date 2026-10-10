import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextArea } from "./TextArea";
const meta = { title: "Design System/TextArea", component: TextArea, args: { label: "折り方の説明", placeholder: "例：半分に折る" } } satisfies Meta<typeof TextArea>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithDescription: Story = { args: { description: "このステップの操作を説明してください。" } };
export const WithError: Story = { args: { errorMessage: "説明を入力してください。" } };
export const Disabled: Story = { args: { isDisabled: true } };

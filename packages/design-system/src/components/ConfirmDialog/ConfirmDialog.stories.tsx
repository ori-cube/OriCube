import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "../Button";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

function WithTrigger(props: ConfirmDialogProps) {
  const [isOpen, setOpen] = useState(props.isOpen);
  return <>
    <Button text="削除する" variant="secondary" onClick={() => setOpen(true)} />
    <ConfirmDialog {...props} isOpen={isOpen} onOpenChange={(next) => { setOpen(next); props.onOpenChange(next); }} onConfirm={() => { props.onConfirm(); setOpen(false); }} />
  </>;
}

const meta = {
  title: "Design System/ConfirmDialog",
  component: ConfirmDialog,
  render: (args) => <WithTrigger {...args} />,
  args: {
    isOpen: false,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: "「鶴」を削除しますか？",
    children: <p>作品とサムネイルを削除します。削除すると元に戻せません。</p>,
    confirmText: "削除する",
    destructive: true,
  },
} satisfies Meta<ConfirmDialogProps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { play: async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.click(canvas.getByRole("button", { name: "削除する" }));
  const dialog = await body.findByRole("alertdialog", { name: "「鶴」を削除しますか？" });
  // 取り消せない操作なので、初期フォーカスはやめる側
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "やめる" })).toHaveFocus());
  await userEvent.keyboard("{Escape}");
  await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
  await userEvent.click(canvas.getByRole("button", { name: "削除する" }));
  await userEvent.click(within(await body.findByRole("alertdialog")).getByRole("button", { name: "削除する" }));
  await expect(args.onConfirm).toHaveBeenCalledTimes(1);
} };
export const Pending: Story = { args: { isOpen: true, isPending: true, confirmText: "削除しています…" } };
export const Failed: Story = { args: { isOpen: true, errorMessage: "削除できませんでした。時間をおいてもう一度お試しください。" } };

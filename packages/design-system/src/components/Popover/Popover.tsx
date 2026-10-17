"use client";

import type { ReactElement, ReactNode } from "react";
import { Dialog, DialogTrigger, Heading, Popover as AriaPopover, type PopoverProps as AriaPopoverProps } from "react-aria-components";
import styles from "./Popover.module.css";

export type PopoverProps = Pick<AriaPopoverProps, "placement" | "isOpen" | "onOpenChange"> & {
  /** React Aria の Button を元にした開閉ボタン（IconButton など）。 */
  trigger: ReactElement;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Popover({ trigger, title, children, placement = "top end", isOpen, onOpenChange, className }: PopoverProps) {
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      {trigger}
      <AriaPopover placement={placement} offset={8} className={styles.popover}>
        <Dialog className={[styles.dialog, className].filter(Boolean).join(" ")}>
          <Heading slot="title" className={styles.title}>{title}</Heading>
          {children}
        </Dialog>
      </AriaPopover>
    </DialogTrigger>
  );
}

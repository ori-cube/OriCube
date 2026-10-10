"use client";

import { FileTrigger, type FileTriggerProps } from "react-aria-components";
import { Button, type ButtonProps } from "../Button";

export type FileButtonProps = Omit<ButtonProps, "onClick"> & Pick<FileTriggerProps, "acceptedFileTypes" | "onSelect">;

export function FileButton({ acceptedFileTypes, onSelect, ...props }: FileButtonProps) {
  return <FileTrigger acceptedFileTypes={acceptedFileTypes} onSelect={onSelect}>
    <Button {...props} />
  </FileTrigger>;
}

"use client";

import { Button, composeRenderProps, type ButtonProps } from "react-aria-components";
import * as icons from "../icons";
import styles from "./IconButton.module.css";

export type IconButtonProps = Omit<ButtonProps, "children" | "aria-label"> & {
  icon: keyof typeof icons;
  label: string;
  variant?: "primary" | "secondary" | "floating";
  size?: "md" | "lg";
  selected?: boolean;
};

const iconSizes = { md: 20, lg: 28 } as const;

export function IconButton({ icon, label, variant = "secondary", size = "md", selected, className, ...props }: IconButtonProps) {
  const Icon = icons[icon];
  return (
    <Button
      {...props}
      aria-label={label}
      aria-pressed={selected}
      className={composeRenderProps(className, (name) => [styles.button, styles[variant], styles[size], name].filter(Boolean).join(" "))}
    >
      <Icon size={iconSizes[size]} aria-hidden />
    </Button>
  );
}

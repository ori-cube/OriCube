"use client";

import {
  Button as AriaButton,
  composeRenderProps,
  type ButtonProps as AriaButtonProps,
  type PressEvent,
} from "react-aria-components";
import * as icons from "../icons";
import styles from "./Button.module.css";

export type ButtonIconName = keyof typeof icons;

export type ButtonProps = Omit<
  AriaButtonProps,
  "isDisabled" | "onPress" | "children"
> & {
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  prefixIcon?: ButtonIconName;
  suffixIcon?: ButtonIconName;
  disabled?: boolean;
  /** 押したままの状態を持つ切り替えボタンにする。状態は aria-pressed で伝える */
  selected?: boolean;
  onClick?: (event: PressEvent) => void;
  text: string;
};

const iconSizes = {
  sm: 16,
  md: 20,
} as const;

export function Button({
  variant = "primary",
  size = "md",
  prefixIcon,
  suffixIcon,
  disabled,
  selected,
  onClick,
  className,
  text,
  ...props
}: ButtonProps) {
  const PrefixIcon = prefixIcon ? icons[prefixIcon] : null;
  const SuffixIcon = suffixIcon ? icons[suffixIcon] : null;

  return (
    <AriaButton
      {...props}
      isDisabled={disabled}
      aria-pressed={selected}
      onPress={onClick}
      className={composeRenderProps(className, (userClassName) =>
        [
          styles.button,
          styles[variant],
          styles[size],
          PrefixIcon && styles.hasPrefix,
          SuffixIcon && styles.hasSuffix,
          userClassName,
        ]
          .filter(Boolean)
          .join(" "),
      )}
    >
      {PrefixIcon && <PrefixIcon size={iconSizes[size]} aria-hidden />}
      {text}
      {SuffixIcon && <SuffixIcon size={iconSizes[size]} aria-hidden />}
    </AriaButton>
  );
}

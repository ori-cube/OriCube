"use client";

import { Checkbox as AriaCheckbox, composeRenderProps, type CheckboxProps as AriaCheckboxProps } from "react-aria-components";
import styles from "./Checkbox.module.css";

export type CheckboxProps = Omit<AriaCheckboxProps, "children"> & { label: string };

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return <AriaCheckbox {...props} className={composeRenderProps(className, (name) => [styles.checkbox, name].filter(Boolean).join(" "))}>
    {({ isSelected }) => <><span className={styles.indicator} aria-hidden>{isSelected ? "✓" : ""}</span><span>{label}</span></>}
  </AriaCheckbox>;
}

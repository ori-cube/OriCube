import type { ComponentPropsWithoutRef } from "react";
import styles from "./FloatingPanel.module.css";

export function FloatingPanel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={[styles.panel, className].filter(Boolean).join(" ")} />;
}

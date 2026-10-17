"use client";

import type { ReactNode } from "react";
import { Disclosure, DisclosurePanel, Heading, composeRenderProps, type DisclosureProps } from "react-aria-components";
import * as icons from "../icons";
import { IconButton } from "../IconButton";
import styles from "./SidePanel.module.css";

export type SidePanelProps = Pick<DisclosureProps, "isExpanded" | "defaultExpanded" | "onExpandedChange" | "className"> & {
  title: string;
  /** 開閉ボタンの読み上げ名。開閉状態は aria-expanded で伝える。 */
  triggerLabel: string;
  icon?: keyof typeof icons;
  children: ReactNode;
};

export function SidePanel({ title, triggerLabel, icon = "MenuIcon", className, children, ...props }: SidePanelProps) {
  return (
    <Disclosure {...props} className={composeRenderProps(className, (name) => [styles.sidePanel, name].filter(Boolean).join(" "))}>
      {({ isExpanded }) => <>
        <div className={styles.header}>
          {isExpanded && <Heading level={2} className={styles.title}>{title}</Heading>}
          <IconButton slot="trigger" className={isExpanded ? undefined : styles.tab} icon={isExpanded ? "CloseIcon" : icon} label={triggerLabel} />
        </div>
        <DisclosurePanel className={styles.panel}>{children}</DisclosurePanel>
      </>}
    </Disclosure>
  );
}

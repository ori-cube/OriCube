"use client";

import type { ReactNode } from "react";
import { Disclosure, DisclosurePanel, Heading, composeRenderProps, type DisclosureProps } from "react-aria-components";
import { IconButton } from "../IconButton";
import styles from "./SidePanel.module.css";

export type SidePanelProps = Pick<DisclosureProps, "isExpanded" | "defaultExpanded" | "onExpandedChange" | "className"> & {
  title: string;
  /** 開閉ボタンの読み上げ名。開閉状態は aria-expanded で伝える。 */
  triggerLabel: string;
  children: ReactNode;
};

export function SidePanel({ title, triggerLabel, className, children, ...props }: SidePanelProps) {
  return (
    <Disclosure {...props} className={composeRenderProps(className, (name) => [styles.sidePanel, name].filter(Boolean).join(" "))}>
      <IconButton slot="trigger" className={styles.tab} icon="PreviousIcon" label={triggerLabel} />
      <DisclosurePanel className={styles.panel}>
        <div className={styles.sheet}>
          <Heading level={2} className={styles.title}>{title}</Heading>
          {children}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

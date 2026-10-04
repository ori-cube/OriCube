import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import styles from "./layout.module.css";

export default function V2Layout({ children }: { children: ReactNode }) {
  return <>
    <a className={styles.skip} href="#origami-viewer">本文へ移動</a>
    <Header enableSearch={false} />
    <div className={styles.content}>{children}</div>
  </>;
}

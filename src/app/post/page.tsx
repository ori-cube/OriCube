"use client";

import styles from "./page.module.scss";
import { Header } from "@/components/Header";
import { OrigamiPost } from "@/components/OrigamiPost";

export default function Home() {
  return (
    <>
      <Header enableSearch={false} />
      <main className={styles.main}>
        <OrigamiPost />
      </main>
    </>
  );
}

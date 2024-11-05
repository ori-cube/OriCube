"use client";
import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";
import { Header } from "@/components/Header";
import { OrigamiListPageProvider } from "./_provider";

export default function Home() {
  return (
    <OrigamiListPageProvider>
      <Header enableSearch={true} />
      <main className={styles.main}>
        <OrigamiList />
      </main>
    </OrigamiListPageProvider>
  );
}

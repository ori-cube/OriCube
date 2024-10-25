import styles from "./page.module.scss";
import { Three } from "@/components/three";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>折り紙</h1>
      <Three />
    </main>
  );
}

import styles from "./page.module.scss";
import { OrigamiList } from "@/components/OrigamiList";

export default function Home() {
  return (
    <main className={styles.main}>
      <OrigamiList />
    </main>
  );
}

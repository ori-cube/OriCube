import styles from "./page.module.scss";
import { Three } from "@/features/three";
import { Flex, Text, Button } from "@radix-ui/themes";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>折り紙</h1>
      <Button>Radix UI</Button>
      <Three />
    </main>
  );
}

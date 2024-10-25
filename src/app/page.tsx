import styles from "./page.module.scss";
import { Three } from "@/components/three";
import { Flex, Text, Button } from "@radix-ui/themes";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>折り紙</h1>
      <Flex direction="column" gap="2">
        <Text>Hello from Radix Themes :)</Text>
        <Button>Let's go</Button>
      </Flex>
      <Three />
    </main>
  );
}

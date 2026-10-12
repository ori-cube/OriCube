import { useSession, signOut } from "next-auth/react";
import { Button } from "@oricube/design-system";
import styles from "./index.module.scss";

export function Logout() {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return <Button text="ログアウト" prefixIcon="GoogleIcon" variant="secondary" onClick={() => signOut()} className={styles.button} />;
}

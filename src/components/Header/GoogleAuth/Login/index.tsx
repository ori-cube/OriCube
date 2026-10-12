import { useSession, signIn } from "next-auth/react";
import { Button } from "@oricube/design-system";
import styles from "./index.module.scss";

export function Login() {
  const { status } = useSession();
  if (status === "authenticated") return null;
  return <Button text="Googleでログイン" prefixIcon="GoogleIcon" variant="secondary" onClick={() => signIn("google", {}, { prompt: "login" })} className={styles.button} />;
}

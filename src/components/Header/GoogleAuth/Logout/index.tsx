import React from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@radix-ui/themes";
import Image from "next/image";
import styles from "./index.module.scss";

export const Logout = () => {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <Button
        color="gray"
        variant="surface"
        highContrast
        onClick={() => signOut()}
        className={styles.button}
      >
        <Image
          src="/assets/google.png"
          alt="google icon"
          width={20}
          height={20}
        />
        ログアウト
      </Button>
    );
  }
  return null;
};

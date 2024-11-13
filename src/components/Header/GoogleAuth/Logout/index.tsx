import React from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@radix-ui/themes";
import Image from "next/image";

export const Logout = () => {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <div>
        <Button
          color="gray"
          variant="surface"
          highContrast
          onClick={() => signOut()}
        >
          <Image
            src="/assets/google.png"
            alt="google icon"
            width={20}
            height={20}
          />
          ログアウト
        </Button>
      </div>
    );
  }
  return null;
};

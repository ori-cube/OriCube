import React from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@radix-ui/themes";
import { HiLogout } from "react-icons/hi";

export const Logout = () => {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <div>
        <Button onClick={() => signOut()}>
          ログアウト
          <HiLogout color="white" />
        </Button>
      </div>
    );
  }
  return null;
};

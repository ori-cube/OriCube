import React from "react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@radix-ui/themes";
import { HiLogin } from "react-icons/hi";

export const Login = () => {
  const { status } = useSession();

  if (status !== "authenticated") {
    return (
      <div>
        <Button onClick={() => signIn("google", {}, { prompt: "login" })}>
          ログイン
          <HiLogin color="white" />
        </Button>
      </div>
    );
  }
  return null;
};

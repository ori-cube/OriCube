import React from "react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@radix-ui/themes";
import Image from "next/image";

export const Login = () => {
  const { status } = useSession();

  if (status !== "authenticated") {
    return (
      <div>
        <Button
          color="gray"
          variant="surface"
          highContrast
          onClick={() => signIn("google", {}, { prompt: "login" })}
        >
          <Image
            src="/assets/google.png"
            alt="google icon"
            width={20}
            height={20}
          />
          Googleでログイン
        </Button>
      </div>
    );
  }
  return null;
};

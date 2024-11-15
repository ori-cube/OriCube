import React from "react";
import { useSession, signIn } from "next-auth/react";

export const Login = () => {
  const { status } = useSession();

  if (status !== "authenticated") {
    return (
      <div>
        <button onClick={() => signIn("google", {}, { prompt: "login" })}>
          ログイン
        </button>
      </div>
    );
  }
  return null;
};

import React from "react";
import { useSession, signOut } from "next-auth/react";

export const Logout = () => {
  const { status } = useSession();

  if (status === "authenticated") {
    return (
      <div>
        <button onClick={() => signOut()}>ログアウト</button>
      </div>
    );
  }
  return null;
};

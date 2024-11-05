"use client";
import { useSession } from "next-auth/react";
import { Login } from "./Login";
import { Logout } from "./Logout";

export const GoogleAuthButton = () => {
  const { status } = useSession();
  return <div>{status === "authenticated" ? <Logout /> : <Login />}</div>;
};

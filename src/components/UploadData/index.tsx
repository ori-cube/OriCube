"use client";
import axios from "axios";
import { useSession } from "next-auth/react";
import data from "@/models/1.json";

export const UploadData = () => {
  const { data: session } = useSession();
  const insertData = async () => {
    if (!session) {
      console.log("ログインしてください");
    } else {
      await axios
        .post("/api/data", {
          mail: session.user?.email,
          title: "1",
          data: data,
        })
        .then(() => {
          console.log("upload完了");
        });
    }
  };

  return (
    <div>
      <button onClick={() => insertData()}>Insert Data</button>
    </div>
  );
};

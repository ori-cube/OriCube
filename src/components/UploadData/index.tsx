"use client";
import { useSession } from "next-auth/react";
import { insertData } from "@/utils/upload-data";

export const UploadData = (blob: Blob) => {
  const { data: session } = useSession();
  return (
    <div>
      <button onClick={() => insertData(blob, session)}>Insert Data</button>
    </div>
  );
};

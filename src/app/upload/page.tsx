"use client";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { insertData } from "@/utils/upload-data";

const ImageBlobUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { data: session } = useSession();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルのMIMEタイプがimage/pngであることを確認
      if (file.type !== "image/png") {
        alert("PNG形式の画像を選択してください。");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      console.log("画像ファイルを選択してください。");
      return;
    }

    try {
      insertData(selectedFile, session);
    } catch (error: any) {
      console.error("エラー:", error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>画像をBlob形式で取得してアップロード</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>PNG画像:</label>
          <input
            type="file"
            accept="image/png"
            onChange={handleFileChange}
            required
          />
        </div>
        <button type="submit">アップロード</button>
      </form>
    </div>
  );
};

export default ImageBlobUploader;

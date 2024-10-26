import fs from "fs";
import path from "path";
import React from "react";
import { Model } from "@/types/model";

// src/modelsから、urlで指定されたモデルのデータを取得する
async function getModelData(id: string): Promise<Model | null> {
  const modelsDir = path.join(process.cwd(), "src/models");
  const filePath = path.join(modelsDir, `${id}.json`);

  if (fs.existsSync(filePath)) {
    const fileContents = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContents);
  }
  return null;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const modelData = await getModelData(slug);

  console.log(modelData);

  if (!modelData) return <div>Model not found</div>;

  return <div>Model: {modelData.name}</div>;
}

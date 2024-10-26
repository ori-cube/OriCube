import fs from "fs";
import path from "path";
import React from "react";
import { Model } from "@/types/model";
import { OrigamiTitle } from "@/components/origami-title";
import { Three } from "@/components/three";

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

type Params = Promise<{ slug: string }>;

export default async function Page(props: { params: Params }) {
  const { slug } = await props.params;
  const modelData = await getModelData(slug);

  if (!modelData) return <div>Model not found</div>;

  return (
    <div>
      <OrigamiTitle title={modelData.name} description="hoge" />
      <Three model={modelData.procedure} foldAngle={100} />
    </div>
  );
}

// ビルド時に動的ルートを生成
export async function generateStaticParams() {
  const modelsDir = path.join(process.cwd(), "src/models");
  const fileNames = fs.readdirSync(modelsDir);
  const paths = fileNames.map((fileName) => ({
    params: { slug: fileName.replace(/\.json$/, "") },
  }));

  return paths;
}

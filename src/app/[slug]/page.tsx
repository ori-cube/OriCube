import React from "react";
import { OrigamiDetail } from "@/components/OrigamiDetail";
import { Header } from "@/components/Header";
import { Model } from "@/types/model";
import axios from "axios";

type Params = Promise<{ slug: string }>;

export default async function Page(props: { params: Params }) {
  const { slug } = await props.params;
  const baseUrl = process.env.NEXT_PUBLIC_URL;
  const response = await axios.get(`${baseUrl}/api/data`, {
    params: { id: slug },
  });
  const modelData: Model = response.data;
  if (!modelData) return <div>Model not found</div>;
  return (
    <div>
      <Header enableSearch={false} />
      <OrigamiDetail modelData={modelData} />
    </div>
  );
}

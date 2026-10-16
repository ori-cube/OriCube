import { notFound } from "next/navigation";
import { OrigamiViewer } from "@/components/v2/OrigamiViewer";
import { getOrigamiV2 } from "@/features/origami-viewer-v2/repository";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { id } = await params;
  const model = await getOrigamiV2(id);
  if (!model) notFound();
  const startAtEnd = (await searchParams).step === "last";
  return <OrigamiViewer key={`${model.id}-${startAtEnd}`} model={model} startAtEnd={startAtEnd} fullscreen />;
}

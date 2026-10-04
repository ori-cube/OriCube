import { notFound } from "next/navigation";
import { OrigamiViewer } from "@/components/v2/OrigamiViewer";
import { getOrigamiV2 } from "@/features/origami-viewer-v2/repository";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = await getOrigamiV2(id);
  if (!model) notFound();
  return <OrigamiViewer key={model.id} model={model} />;
}

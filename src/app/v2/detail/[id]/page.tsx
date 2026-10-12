import { notFound, redirect } from "next/navigation";
import { getOrigamiV2 } from "@/features/origami-viewer-v2/repository";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = await getOrigamiV2(id);
  if (!model) notFound();
  redirect(`/v2/view/${model.id}?step=last`);
}

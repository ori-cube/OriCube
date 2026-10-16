import { redirect } from "next/navigation";
import { DEFAULT_ORIGAMI_V2_ID } from "@/features/origami-viewer-v2/repository";

export default function Page() {
  redirect(`/v2/view/${DEFAULT_ORIGAMI_V2_ID}`);
}

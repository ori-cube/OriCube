import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router";
import { Button } from "@oricube/design-system";
import { OrigamiViewer } from "@/components/v2/OrigamiViewer";
import { apiClient, fetchOrigami } from "../apiClient";
import { NotFoundPage } from "./NotFoundPage";

export function ViewPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const startAtEnd = searchParams.get("step") === "last";
  const query = useQuery({ queryKey: ["origami", id], queryFn: () => fetchOrigami(apiClient, id) });

  if (query.isPending) return <main id="origami-viewer" style={{ padding: "2rem" }}><p role="status">折り紙を読み込んでいます…</p></main>;
  if (query.isError) {
    return <main id="origami-viewer" style={{ padding: "2rem" }}>
      <h1>折り紙を読み込めませんでした</h1>
      <p role="alert">もう一度読み込んでください。</p>
      <Button text="再試行" onClick={() => void query.refetch()} />
    </main>;
  }
  if (!query.data) return <NotFoundPage />;
  return <OrigamiViewer key={`${query.data.id}-${startAtEnd}`} model={query.data} startAtEnd={startAtEnd} fullscreen />;
}

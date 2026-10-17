import { MockWorkshop } from "../features/mock-workshop/MockWorkshop";
import { PublishButton } from "../features/publish/PublishButton";

export function PostPage() {
  return <MockWorkshop actions={(draft, blocked) => <PublishButton model={draft?.model ?? null} disabled={blocked} />} />;
}

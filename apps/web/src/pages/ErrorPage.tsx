import { Button } from "@oricube/design-system";

export function ErrorPage() {
  return <main id="origami-viewer" style={{ padding: "2rem" }}>
    <h1>画面を表示できませんでした</h1>
    <p role="alert">ページを読み込み直してください。</p>
    <Button text="再読み込み" onClick={() => window.location.reload()} />
  </main>;
}

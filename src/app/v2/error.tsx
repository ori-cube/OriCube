"use client";

import { Button } from "@oricube/design-system";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="origami-viewer" style={{ padding: "2rem" }}>
    <h1>折り紙を読み込めませんでした</h1>
    <p role="alert">もう一度読み込んでください。</p>
    <Button text="再試行" onClick={reset} />
  </main>;
}

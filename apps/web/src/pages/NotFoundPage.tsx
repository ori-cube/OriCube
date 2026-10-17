import { Link } from "react-router";

export function NotFoundPage() {
  return <main id="origami-viewer" style={{ padding: "2rem" }}>
    <h1>折り紙が見つかりませんでした</h1>
    <p>指定された作品はありません。</p>
    <Link to="/view">鶴の折り方を見る</Link>
  </main>;
}

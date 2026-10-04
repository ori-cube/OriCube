import Link from "next/link";

export default function NotFound() {
  return <main id="origami-viewer" style={{ padding: "2rem" }}>
    <h1>折り紙が見つかりませんでした</h1>
    <p>指定された作品はありません。</p>
    <Link href="/v2/view">鶴の折り方を見る</Link>
  </main>;
}

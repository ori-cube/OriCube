# V2 閲覧ページとデータ取得

## 確認用 URL

- `/v2/view` → `/v2/view/crane`（折り方）
- `/v2/detail` → `/v2/detail/crane`（完成形）
- `/v2/view/blank-paper`（手順がない作品）
- `/v2/view/unknown`（作品がない場合の404）

V1 の `[slug]` ページと `OrigamiDetail`、旧データ形式を使う Storybook の `v2/OrigamiDetail` は変更していない。新しい表示部品は `v2/OrigamiViewer`。投稿画面への変更も含まない。

## API に差し替える箇所

`repository.ts` の `getOrigamiV2(id)` だけを、本番の取得処理に置き換える。取得処理の契約は `Promise<OrigamiModelV2 | null>`。

| フィールド | 意味 |
| --- | --- |
| `id` | `/v2/view/[id]` と `/v2/detail/[id]` で使用する作品 ID |
| `name`, `description`, `color` | 表示用の作品情報 |
| `procedure` | 投稿側の `exportProcedureV2` が返す `ProcedureV2` をそのまま使用 |
| `stepDescriptions` | 任意。裏返しを含まない折りステップ順の説明文 |

保存済みの `Model.procedure` が `version: 2` であることを取得境界で検証し、旧 V1 データはこの取得関数から返さない。見つからない作品は `null`、通信エラーは例外にする。ページがそれぞれ404画面と再試行可能なエラー画面を表示する。

API が返す JSON は `OrigamiModelV2` の形に変換する。`procedure` の各 polygon/vertexAxes の頂点数、座標の有限値、size > 0 をサーバー側の取り込み時に検証する。スライダーやページネーションは新しい配列長に追従するため、画面側の API 接続変更は不要。

DB・認証・ストレージ・既存 `/api/data` には接続しない。モックの `crane.ts` は既存の鶴のジェスチャと投稿側のエクスポートから生成した答えデータ。首と尾を胴体から起こし、頭を直角に折り込み、両翼を付け根で90度開く。`crane.test.ts` で全手順の投稿側の表示座標と完成形の各レイヤーを比較する。閲覧時にはソルバを実行しない。

## 裏返しとステップ番号

V2 の `history[].viewFront` の切り替えから裏返しを挿入する。モックは折り15回と裏返し5回の計20ステップ。説明文は `sourceIndex` で折りステップへ対応付ける。

裏返しで形状は変化せず、表示全体が Y 軸周りに180度回る。折りの前後で表裏が変化しない視点操作や、最後の折り以降の視点操作は保存されていないため表示できない。明示的な flip を保存する拡張が必要になった場合は投稿側とデータ型も合わせて変更する。

## 操作と検証

- 再生・一時停止・スライダー・同じ手順の繰り返し
- ページネーション。狭い画面では前後ボタンと現在番号
- 完成形と折り方へのリンク
- ドラッグ、キャンバス上の矢印キー、正面/斜め視点、拡大/縮小、視点リセット
- 動きを減らす設定では再生ボタンで終点へ切り替え、繰り返しを無効化
- 非表示中の再生を停止し、離脱時にフレームと描画資源を破棄

実装の検証コマンド:

```sh
pnpm exec vitest run
pnpm --filter @oricube/design-system typecheck
pnpm exec tsc --noEmit --incremental false
pnpm exec next lint
pnpm exec storybook build
```

ブラウザでは全20ステップの0%/100%、各操作種類の中間位置、最後から最初への移動、320px幅、キーボード操作、reduced motion、WebGLエラーと再試行を確認する。

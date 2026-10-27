# @oricube/api

v2のAPI（Hono）と、画面の同一オリジン配信。方針は [#100](https://github.com/ori-cube/OriCube/issues/100) を参照。

## 開発

```sh
pnpm dev:api   # http://localhost:8787/api
pnpm dev:web   # http://localhost:5173 （/api を上のAPIへproxy）
```

`pnpm dev:api`（`src/dev.ts`）は、Turnstile の秘密鍵（`TURNSTILE_SECRET_KEY`）が無ければ投稿時の人の確認を省く。画面の投稿（`/post` の「投稿へ進む」）を確かめるためのもので、本番の入口（`src/index.ts`・`src/worker.ts`）では使わない（秘密鍵が無ければ投稿をすべて拒否する）。

## Cloudflare Workers

本番は Cloudflare Workers で動かす（#100）。設定は `wrangler.jsonc`、入口は `src/worker.ts`。

```sh
pnpm dev:worker      # 画面をビルドして wrangler dev（workerd）で起動
pnpm deploy:worker   # 画面をビルドして wrangler deploy（Cloudflare のログインが必要）
```

- `/assets/*` は Worker を通さずに静的配信し、それ以外（API・作品ページのOGP・404）は Worker が返す（`run_worker_first`）。
- `index.html` は `ASSETS` バインディングから読み、isolate ごとに1回だけアプリを組み立てる。
- `APP_ORIGIN` は Cloudflare の環境変数（`vars`）で設定する。

### D1（作品の保存先）

作品は Cloudflare D1 に保存する（`DB` バインディング、ORM は Drizzle）。スキーマは `migrations/*.sql` と `src/db/schema.ts` の両方に書き、`src/d1Repository.test.ts` で一致を確かめる。

```sh
pnpm --filter @oricube/api db:migrate:local    # wrangler dev のローカル D1 に適用
pnpm --filter @oricube/api db:migrate:remote   # 本番の D1 に適用（Cloudflare のログインが必要）
```

保存契約（#100）: 下書きはブラウザ内だけに置き、サーバーには投稿した作品だけを保存する。公開範囲は `public`（一覧・検索に載る）か `unlisted`（URLを知っている人だけ。作品ページは `noindex`）。再編集は同じIDで上書きし、過去の版は残さない。保存時にデータ形式（`format_version`）とエンジンの版（`engine_version`、`@oricube/engine` の `ENGINE_VERSION`）を記録する。削除は行ごと消す。

初回は `wrangler d1 create oricube` で D1 を作り、表示された `database_id` を `wrangler.jsonc` に設定する。`DB` が無い環境（Node.js・テスト）はメモリ上のモックを使う。作品一覧ができるまでは、D1 に無いIDは鶴などのモックから読む（`withMockFallback`）。

## Node.js での起動

```sh
pnpm build:app   # apps/web/dist と apps/api/dist/index.js を作る
pnpm start:app   # http://localhost:8787 で画面とAPIを返す
```

| 環境変数 | 用途 |
| --- | --- |
| `PORT` | 待ち受けポート（既定 8787） |
| `APP_ORIGIN` | OGPの絶対URLに使う公開オリジン（例: `https://oricube.example`）。未指定ならリクエストのオリジン |
| `WEB_DIST_DIR` | ビルド済み画面の場所（既定 `apps/web/dist`）。無ければAPIだけを起動する |

## ルート

| パス | 内容 |
| --- | --- |
| `GET /api/models` | 公開（`public`）の作品の一覧（新しい順・1ページ24件）。限定公開の作品は載らない。`q` で名前と説明を検索し、`page` でページを指定する。手順の本体は返さず、投稿・更新のときに保存した要約（ステップ数と完成形の図）を返す |
| `GET /api/models/:id` | 作品の取得。保存済みの値も `origamiModelSchema` で検証してから返す |
| `GET /api/models/:id/thumbnail.png` | 完成形の図の PNG（下のサムネイル）。Workers では Cache API に1時間置く |
| `POST /api/models` | 作品の投稿（ログイン不要）。本文は作品と `turnstileToken`。IDと編集用の鍵はサーバーが決め、`{ id, editKey }` を返す |
| `PUT /api/models/:id` | 作品の更新（`X-Edit-Key` ヘッダーに編集用の鍵が必要） |
| `DELETE /api/models/:id` | 作品の削除（`X-Edit-Key` ヘッダーに編集用の鍵が必要） |
| `GET /view/:id` | SPAの `index.html` に作品名・説明のタイトルとOGPを入れて返す。存在しない作品はHTTP 404 |
| `GET /`・`/view`・`/post` | SPAの `index.html` |
| `/assets/*` | ビルド済みの静的ファイル |
| それ以外 | HTTP 404（画面はSPAの404表示、`/api/*` はJSON） |

- APIのエラーは `{ "error": { "code", "message" } }` の形で返す（`invalid_request` 400・`unauthorized` 401・`forbidden` 403・`not_found` 404・`payload_too_large` 413・`internal_error` 500）。
- ログインはない。投稿者の情報（メールアドレスなど）は集めない。投稿の乱用は次の3つで抑える（下の「投稿の保護」）
- 他サイトからのフォーム送信は `hono/csrf` で拒否する。JSONの書き込みはクロスオリジンだとプリフライトで止まる（CORSは許可しない）。
- フロントは `AppType` を type-only import し、`hono/client` で呼ぶ。
- ページのmeta生成（`src/pages.ts`）は実行環境に依存しない。実行環境ごとの入口は `src/worker.ts`（Cloudflare Workers）と `src/index.ts`（Node.js。CIのスモークテストで使う）。
- 一覧は保存先（`OrigamiRepository.listPublic`）が検索・件数・ページ分割を行う。D1 では SQL の `LIKE`・`COUNT`・`LIMIT`/`OFFSET` で絞り、手順は読まない。要約（`step_count`・`thumbnail`・`search_text`）は投稿・更新のときに `src/summary.ts` で作って保存する。手順からタイムラインを組むのは作品1件で数msかかり、一覧のたびに計算すると作品数に比例して重くなるため
- 検索の対象（`search_text`）は名前と説明を NFKC・小文字にそろえた値で、検索語も同じようにそろえて部分一致で探す
- 要約の列が無い作品（`0005` より前に保存したもの）は、一覧のときに手順から作る。更新すると要約が保存される
- 作品の保存先は `OrigamiRepository`（`src/repository.ts`）。Workers では D1（`src/d1Repository.ts`）、Node.js とテストではメモリ上の実装を使う。D1 の列は `migrations/` に番号順で追加する（`0003` で見せる向きを追加し、`0004` で投稿画像の保存と公開前の状態をやめ、`0005` で一覧の要約を追加し、`0006` で持ち主の記録を編集用の鍵に替えた）。

## 投稿の保護

ログインの代わりに、次の3つで bot の大量投稿と他人による変更を防ぐ。

- **Cloudflare Turnstile**（`src/humanCheck.ts`）: 画面のウィジェットが発行したトークンを、投稿のたびに siteverify で検証する。失敗なら `403 verification_failed`。`APP_ORIGIN` があれば、トークンを発行したホスト名も確かめる。秘密鍵 `TURNSTILE_SECRET_KEY` が無い本番の入口は投稿をすべて拒否する
- **回数の上限**（`src/rateLimit.ts`）: Workers の Rate Limiting バインディングで、接続元の IP（`CF-Connecting-IP`）ごとに投稿は1分3回、更新・削除は1分20回まで。超えたら `429 rate_limited`。数え方は Cloudflare の拠点ごとの近似
- **編集用の鍵**（`src/editKey.ts`）: 投稿の応答で256bitの乱数の鍵を1回だけ返し、DB には SHA-256 だけを保存する（`edit_key_hash`）。更新・削除は `X-Edit-Key` ヘッダーの鍵が合うときだけ。画面は鍵をブラウザ（localStorage）に保存し、無くすと編集・削除できない

初回は Turnstile のウィジェットを作り（Cloudflare のダッシュボード → Turnstile）、秘密鍵を Worker に、サイトキーを画面のビルドに設定する。

```bash
pnpm --filter @oricube/api exec wrangler secret put TURNSTILE_SECRET_KEY
VITE_TURNSTILE_SITE_KEY=<サイトキー> pnpm deploy:worker
```

ローカルで本物の確認を試すときは、Cloudflare のテスト用のキー（サイトキー `1x00000000000000000000AA`・秘密鍵 `1x0000000000000000000000000000000AA`。常に成功する）を使う。

## サムネイル

作品一覧と OGP に使う完成形の図。投稿者から画像は受け付けず、保存済みの手順と完成形を見せる向き（`presentation`）からサーバーが描く。任意の画像を一覧や SNS のカードに置かせないため。

- 図は engine の `createProcedureThumbnail`（完成形を正面から平行投影した多角形）。一覧の API はこの図をそのまま返し、画面が SVG で描く（`OrigamiThumbnail`）
- `GET /api/models/:id/thumbnail.png` は同じ図を 640px 四方の PNG にして返す（`src/thumbnailImage.ts`）。作品ページの og:image に使う。色・陰影・輪郭は一覧の SVG と同じにする
- PNG の塗りと書き出しは依存を増やさずに `src/thumbnailImage.ts` で行う（多角形の塗りつぶしと、`CompressionStream` による zlib 圧縮）。画像は保存しない。描くのに数十msかかるため、Workers では Cache API（`hono/cache`）に1時間置いて使い回す（`Cache-Control: public, max-age=3600`）。作品を更新しても、その間は前の画像を返すことがある
- 向きは投稿画面で完成形を回して決める（`apps/web/src/features/post-editor`）。作品を更新すると図も変わる

# @oricube/api

v2のAPI（Hono）と、画面の同一オリジン配信。方針は [#100](https://github.com/ori-cube/OriCube/issues/100) を参照。

## 開発

```sh
pnpm dev:api   # http://localhost:8787/api
pnpm dev:web   # http://localhost:5173 （/api を上のAPIへproxy）
```

`pnpm dev:api`（`src/dev.ts`）は、Clerk のキー（`CLERK_SECRET_KEY`・`CLERK_PUBLISHABLE_KEY`）が無ければ固定の開発ユーザー `dev_user` でログインしている扱いにする。画面の投稿（`/post` の「投稿へ進む」）をログイン画面なしで確かめるためのもので、本番の入口（`src/index.ts`・`src/worker.ts`）では使わない。

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
| `GET /api/models` | 公開（`public`）の作品の一覧（新しい順・1ページ24件）。限定公開の作品は載らない。`q` で名前と説明を検索し、`page` でページを指定する。手順の本体は返さず、完成形の図（`createProcedureThumbnail`）を付ける |
| `GET /api/models/:id` | 作品の取得。保存済みの値も `origamiModelSchema` で検証してから返す |
| `GET /api/models/:id/thumbnail.png` | 完成形の図の PNG（下のサムネイル） |
| `POST /api/models` | 作品の投稿（ログイン必須）。IDはサーバーで採番し、所有者はClerkで検証したユーザーID |
| `PUT /api/models/:id` | 作品の更新（ログイン必須・所有者のみ） |
| `DELETE /api/models/:id` | 作品の削除（ログイン必須・所有者のみ） |
| `GET /view/:id` | SPAの `index.html` に作品名・説明のタイトルとOGPを入れて返す。存在しない作品はHTTP 404 |
| `GET /`・`/view`・`/post` | SPAの `index.html` |
| `/assets/*` | ビルド済みの静的ファイル |
| それ以外 | HTTP 404（画面はSPAの404表示、`/api/*` はJSON） |

- APIのエラーは `{ "error": { "code", "message" } }` の形で返す（`invalid_request` 400・`unauthorized` 401・`forbidden` 403・`not_found` 404・`payload_too_large` 413・`internal_error` 500）。
- ログインは Clerk のセッション（同一オリジンの Cookie）を `src/auth.ts` で検証する。`CLERK_SECRET_KEY`・`CLERK_PUBLISHABLE_KEY` が無い環境では未ログイン扱いになり、書き込みAPIは401を返す。Workers ではシークレットを `wrangler secret put CLERK_SECRET_KEY` で設定する。
- 画面側は `VITE_CLERK_PUBLISHABLE_KEY`（`apps/web` のビルド時の環境変数）があるときだけログインを有効にする。ログイン画面は Clerk が提供するページへ移動し、画面に Clerk の部品は埋め込まない。未ログインで投稿画面の「ログインして投稿」を押すとログイン画面へ移り、ログイン後は作成画面へ戻る（下書きはブラウザに保存済み。戻っただけでは投稿しない）。
- 他サイトからのフォーム送信は `hono/csrf` で拒否する。JSONの書き込みはクロスオリジンだとプリフライトで止まる（CORSは許可しない）。
- フロントは `AppType` を type-only import し、`hono/client` で呼ぶ。
- ページのmeta生成（`src/pages.ts`）は実行環境に依存しない。実行環境ごとの入口は `src/worker.ts`（Cloudflare Workers）と `src/index.ts`（Node.js。CIのスモークテストで使う）。
- 一覧の検索とページ分割は、保存先から作品を全件読んでAPI側で行う。作品数が増えたら `OrigamiRepository` 側の検索・ページ分割へ移す。
- 作品の保存先は `OrigamiRepository`（`src/repository.ts`）。Workers では D1（`src/d1Repository.ts`）、Node.js とテストではメモリ上の実装を使う。D1 の列は `migrations/` に番号順で追加する（`0003` で見せる向きを追加し、`0004` で投稿画像の保存と公開前の状態をやめた）。

## サムネイル

作品一覧と OGP に使う完成形の図。投稿者から画像は受け付けず、保存済みの手順と完成形を見せる向き（`presentation`）からサーバーが描く。任意の画像を一覧や SNS のカードに置かせないため。

- 図は engine の `createProcedureThumbnail`（完成形を正面から平行投影した多角形）。一覧の API はこの図をそのまま返し、画面が SVG で描く（`OrigamiThumbnail`）
- `GET /api/models/:id/thumbnail.png` は同じ図を 640px 四方の PNG にして返す（`src/thumbnailImage.ts`）。作品ページの og:image に使う。色・陰影・輪郭は一覧の SVG と同じにする
- PNG の塗りと書き出しは依存を増やさずに `src/thumbnailImage.ts` で行う（多角形の塗りつぶしと、`CompressionStream` による zlib 圧縮）。画像は保存せず、リクエストごとに描く（`Cache-Control: public, max-age=3600`）
- 向きは投稿画面で完成形を回して決める（`apps/web/src/features/post-editor`）。作品を更新すると図も変わる

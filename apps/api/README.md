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

保存契約（#100）: 下書きはブラウザ内だけに置き、サーバーには投稿した作品だけを保存する。公開範囲は `public`（一覧・検索に載る）か `unlisted`（URLを知っている人だけ。作品ページは `noindex`）。再編集は同じIDで上書きし、過去の版は残さない。保存時にデータ形式（`format_version`）とエンジンの版（`engine_version`、`@oricube/engine` の `ENGINE_VERSION`）を記録する。削除は行ごと消す（サムネイルの画像も消す）。公開範囲とは別に、投稿はサムネイルを確かめるまで公開前（`pending`）で、公開範囲に関わらず取得・一覧・作品ページに出さない（下のサムネイル）。

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
| `GET /api/models` | 公開（`public`）かつ公開済み（`published`）の作品の一覧（新しい順・1ページ24件）。限定公開と公開前の作品は載らない。`q` で名前と説明を検索し、`page` でページを指定する。手順の本体は返さず、撮影したサムネイルの URL（`thumbnailUrl`、無ければ null）と完成形の図（`createProcedureThumbnail`）を付ける |
| `GET /api/models/:id` | 作品の取得。保存済みの値も `origamiModelSchema` で検証してから返す。公開前（pending）は404 |
| `POST /api/models` | 作品の投稿（ログイン必須）。本文は作品と `thumbnail: { contentType, size }`。IDはサーバーで採番し、所有者はClerkで検証したユーザーID。`pending` で作り、サムネイルのアップロード先（`thumbnailUpload`）を返す |
| `POST /api/models/:id/thumbnail-upload` | サムネイルのアップロード先を作る（ログイン必須・所有者のみ）。公開前の作品は作り直し（期限切れ・撮り直し）で、記録も新しいキーにする。公開済みの作品は再編集での撮り直しで、`PUT /thumbnail` で差し替えるまで今のサムネイルのまま |
| `POST /api/models/:id/publish` | 申告どおりのサムネイルが置かれていれば公開する（ログイン必須・所有者のみ）。無ければ409。公開済みなら何もせず200 |
| `GET /api/me/models` | 自分の作品の一覧（ログイン必須）。限定公開・公開前（`pending`）も含め、新しい順。各作品に `visibility`・`status` を付ける |
| `PUT /api/models/:id` | 作品の更新（ログイン必須・所有者のみ）。同じIDで上書きし、サムネイルは変えない |
| `PUT /api/models/:id/thumbnail` | 公開済みの作品のサムネイルを差し替える（ログイン必須・所有者のみ）。本文は `{ key }`（`thumbnail-upload` が返した `thumbnailKey`）。置かれていなければ409。古い画像は消す |
| `DELETE /api/models/:id` | 作品の削除（ログイン必須・所有者のみ）。サムネイルも消す |
| `PUT /api/storage/uploads/:token`・`GET /api/storage/objects/*` | サムネイルのアップロード先（署名付き）と画像の配信（R2）。R2 が無い環境では `/api/mock-storage/*`（メモリ上） |
| `GET /view/:id` | SPAの `index.html` に作品名・説明のタイトルとOGPを入れて返す。存在しない作品はHTTP 404 |
| `GET /`・`/view`・`/post`・`/me` | SPAの `index.html`（`/me` は `noindex`） |
| `/assets/*` | ビルド済みの静的ファイル |
| それ以外 | HTTP 404（画面はSPAの404表示、`/api/*` はJSON） |

- APIのエラーは `{ "error": { "code", "message" } }` の形で返す（`invalid_request` 400・`unauthorized` 401・`forbidden` 403・`not_found` 404・`conflict` 409・`payload_too_large` 413・`internal_error` 500）。
- ログインは Clerk のセッション（同一オリジンの Cookie）を `src/auth.ts` で検証する。`CLERK_SECRET_KEY`・`CLERK_PUBLISHABLE_KEY` が無い環境では未ログイン扱いになり、書き込みAPIは401を返す。Workers ではシークレットを `wrangler secret put CLERK_SECRET_KEY` で設定する。
- 画面側は `VITE_CLERK_PUBLISHABLE_KEY`（`apps/web` のビルド時の環境変数）があるときだけログインを有効にする。ログイン画面は Clerk が提供するページへ移動し、画面に Clerk の部品は埋め込まない。未ログインで投稿画面の「ログインして投稿」を押すとログイン画面へ移り、ログイン後は作成画面へ戻る（下書きはブラウザに保存済み。戻っただけでは投稿しない）。
- 他サイトからのフォーム送信は `hono/csrf` で拒否する。JSONの書き込みはクロスオリジンだとプリフライトで止まる（CORSは許可しない）。
- フロントは `AppType` を type-only import し、`hono/client` で呼ぶ。
- ページのmeta生成（`src/pages.ts`）は実行環境に依存しない。実行環境ごとの入口は `src/worker.ts`（Cloudflare Workers）と `src/index.ts`（Node.js。CIのスモークテストで使う）。
- 一覧の検索とページ分割は、保存先から公開済みの作品を全件読んでAPI側で行う。作品数が増えたら `OrigamiRepository` 側の検索・ページ分割へ移す。
- 作品の保存先は `OrigamiRepository`（`src/repository.ts`）。Workers では D1（`src/d1Repository.ts`）、Node.js とテストではメモリ上の実装を使う。D1 の列は `migrations/` に番号順で追加する（`0003` で公開状態・サムネイル・見せる向きを追加）。

## サムネイル

作品一覧と OGP に使う正方形の画像（PNG・WebP、512KiB まで）。画面の投稿で完成形を好きな向きに回して撮影する（`apps/web/src/features/post-editor`）。

DBと画像の保存先は単一トランザクションにならないため、#100 の流れで保存する。

1. `POST /api/models` で作品を `pending` で作る。画像のキー（`thumbnails/<作品ID>/<UUID>.<拡張子>`）はサーバーが決め、形式とサイズを記録する
2. 返したアップロード先（署名付きのURL）へ、ブラウザが画像を `PUT` する（作品のAPIは通さない）
3. `POST /api/models/:id/publish` で、申告どおりの画像が置かれたことを確かめて `published` にする

- 公開前の作品は取得・一覧・作品ページに出さない。画面は途中で失敗しても、同じ内容の再試行では作品を作り直さない（重複を残さない）
- 保存先は `ThumbnailStorage`（`src/storage.ts`）。Workers では R2（`THUMBNAILS` バインディング）、Node.js とテストではメモリ上の実装（`/api/mock-storage/*`。永続化されない）を使う
- アップロード先は `/api/storage/uploads/<トークン>`。トークンはキー・形式・サイズ・期限（10分）を HMAC-SHA256 で署名したもので、Worker が署名と期限を確かめ、形式とサイズが申告と違えば拒否してから R2 に置く。R2 の presigned URL（S3 互換 API）と違い、R2 の API トークンや追加の依存を使わない
- 画像は公開バケットにせず、Worker が `/api/storage/objects/thumbnails/...` で返す（`thumbnailKey` の形のキーだけ。`Cache-Control: immutable`）
- 署名の秘密の値 `THUMBNAIL_UPLOAD_SECRET`（32文字以上）が無い・短いときは、投稿（アップロード先の発行）だけを失敗させ、保存済みの画像は返す
- 一覧は撮影した画像があればそれを、無い作品（モックなど）は手順から作る完成形の図を表示する。作品ページの og:image はサムネイル、無い作品はロゴ
- 公開後の撮り直し: `thumbnail-upload` で新しいキーへ置き、`PUT /api/models/:id/thumbnail` で差し替える。キーはその作品の `thumbnailKey` の形だけを受け付ける（アップロード先は所有者にだけ発行する）
- 未対応: `pending` のまま残った作品・画像の定期的な掃除

初回は R2 のバケットと署名の秘密の値を用意する。

```bash
pnpm --filter @oricube/api exec wrangler r2 bucket create oricube-thumbnails
openssl rand -base64 48 | pnpm --filter @oricube/api exec wrangler secret put THUMBNAIL_UPLOAD_SECRET
```

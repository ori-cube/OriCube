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
| `GET /api/models` | 公開済みの作品の一覧（新しい順、`?limit=` 既定30・最大100）。`{ items: [{ id, name, color, thumbnailUrl }] }` |
| `GET /api/models/:id` | 作品の取得。保存済みの値も `origamiModelSchema` で検証してから返す。公開前（pending）は404 |
| `POST /api/models` | 作品の投稿（ログイン必須）。本文は作品と `thumbnail: { contentType, size }`。IDはサーバーで採番し、所有者はClerkで検証したユーザーID。`pending` で作り、サムネイルのアップロード先（`thumbnailUpload`）を返す |
| `POST /api/models/:id/thumbnail-upload` | 公開前の作品のアップロード先を作り直す（ログイン必須・所有者のみ。期限切れ・撮り直し） |
| `POST /api/models/:id/publish` | 申告どおりのサムネイルが置かれていれば公開する（ログイン必須・所有者のみ）。無ければ409。公開済みなら何もせず200 |
| `PUT /api/models/:id` | 作品の更新（ログイン必須・所有者のみ） |
| `DELETE /api/models/:id` | 作品の削除（ログイン必須・所有者のみ）。サムネイルも消す |
| `PUT /api/mock-storage/uploads/:token`・`GET /api/mock-storage/objects/*` | 開発用のメモリ上の保存先（R2 の presigned URL と公開URLの代わり） |
| `GET /view/:id` | SPAの `index.html` に作品名・説明のタイトルとOGPを入れて返す。存在しない作品はHTTP 404 |
| `GET /`・`/view`・`/post` | SPAの `index.html` |
| `/assets/*` | ビルド済みの静的ファイル |
| それ以外 | HTTP 404（画面はSPAの404表示、`/api/*` はJSON） |

- APIのエラーは `{ "error": { "code", "message" } }` の形で返す（`invalid_request` 400・`unauthorized` 401・`forbidden` 403・`not_found` 404・`conflict` 409・`payload_too_large` 413・`internal_error` 500）。
- ログインは Clerk のセッション（同一オリジンの Cookie）を `src/auth.ts` で検証する。`CLERK_SECRET_KEY`・`CLERK_PUBLISHABLE_KEY` が無い環境では未ログイン扱いになり、書き込みAPIは401を返す。Workers ではシークレットを `wrangler secret put CLERK_SECRET_KEY` で設定する。
- 他サイトからのフォーム送信は `hono/csrf` で拒否する。JSONの書き込みはクロスオリジンだとプリフライトで止まる（CORSは許可しない）。
- フロントは `AppType` を type-only import し、`hono/client` で呼ぶ。
- ページのmeta生成（`src/pages.ts`）は実行環境に依存しない。実行環境ごとの入口は `src/worker.ts`（Cloudflare Workers）と `src/index.ts`（Node.js。CIのスモークテストで使う）。
- 作品の保存先は `OrigamiRepository`（`src/repository.ts`）。DB接続まではメモリ上の実装で、Workers では書き込みが永続化されない。

## サムネイル

作品一覧と OGP に使う正方形の画像（PNG・WebP、512KiB まで）。画面の投稿で完成形を好きな向きに回して撮影する（`apps/web/src/features/post-editor`）。

DBと画像の保存先は単一トランザクションにならないため、#100 の流れで保存する。

1. `POST /api/models` で作品を `pending` で作る。画像のキー（`thumbnails/<作品ID>/<UUID>.<拡張子>`）はサーバーが決め、形式とサイズを記録する
2. 返したアップロード先へ、ブラウザが画像を直接 `PUT` する（API を通さない）
3. `POST /api/models/:id/publish` で、申告どおりの画像が置かれたことを確かめて `published` にする

- 公開前の作品は取得・一覧・作品ページに出さない。画面は途中で失敗しても、同じ内容の再試行では作品を作り直さない（重複を残さない）
- 保存先は `ThumbnailStorage`（`src/storage.ts`）。R2 に接続するまではメモリ上の実装で、アップロード先は `/api/mock-storage/uploads/:token`（10分で期限切れ。形式とサイズが申告と違えば拒否）、画像は `/api/mock-storage/objects/*` で返す
- 作品ページの og:image はサムネイル、無い作品（モック）はロゴ
- 未対応: R2 の presigned URL の発行と公開URL、`pending` のまま残った作品・画像の定期的な掃除、公開後のサムネイルの差し替え

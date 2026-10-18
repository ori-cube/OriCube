# @oricube/api

v2のAPI（Hono）と、画面の同一オリジン配信。方針は [#100](https://github.com/ori-cube/OriCube/issues/100) を参照。

## 開発

```sh
pnpm dev:api   # http://localhost:8787/api
pnpm dev:web   # http://localhost:5173 （/api を上のAPIへproxy）
```

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
| `GET /api/models` | 作品の一覧（新しい順・1ページ24件）。`q` で名前と説明を検索し、`page` でページを指定する。手順の本体は返さず、完成形のサムネイル（`createProcedureThumbnail`）を付ける |
| `GET /api/models/:id` | 作品の取得。保存済みの値も `origamiModelSchema` で検証してから返す |
| `POST /api/models` | 作品の投稿（ログイン必須）。IDはサーバーで採番し、所有者はClerkで検証したユーザーID |
| `PUT /api/models/:id` | 作品の更新（ログイン必須・所有者のみ） |
| `DELETE /api/models/:id` | 作品の削除（ログイン必須・所有者のみ） |
| `GET /view/:id` | SPAの `index.html` に作品名・説明のタイトルとOGPを入れて返す。存在しない作品はHTTP 404 |
| `GET /`・`/view`・`/post` | SPAの `index.html` |
| `/assets/*` | ビルド済みの静的ファイル |
| それ以外 | HTTP 404（画面はSPAの404表示、`/api/*` はJSON） |

- APIのエラーは `{ "error": { "code", "message" } }` の形で返す（`invalid_request` 400・`unauthorized` 401・`forbidden` 403・`not_found` 404・`payload_too_large` 413・`internal_error` 500）。
- ログインは Clerk のセッション（同一オリジンの Cookie）を `src/auth.ts` で検証する。`CLERK_SECRET_KEY`・`CLERK_PUBLISHABLE_KEY` が無い環境では未ログイン扱いになり、書き込みAPIは401を返す。Workers ではシークレットを `wrangler secret put CLERK_SECRET_KEY` で設定する。
- 他サイトからのフォーム送信は `hono/csrf` で拒否する。JSONの書き込みはクロスオリジンだとプリフライトで止まる（CORSは許可しない）。
- フロントは `AppType` を type-only import し、`hono/client` で呼ぶ。
- ページのmeta生成（`src/pages.ts`）は実行環境に依存しない。実行環境ごとの入口は `src/worker.ts`（Cloudflare Workers）と `src/index.ts`（Node.js。CIのスモークテストで使う）。
- 一覧の検索とページ分割はメモリ上で行う。DB接続時に `OrigamiRepository` の検索・ページ分割へ移し、サムネイルは保存済みの画像に置き換える。
- 作品の保存先は `OrigamiRepository`（`src/repository.ts`）。DB接続まではメモリ上の実装で、Workers では書き込みが永続化されない。og:image は作品のサムネイル保存ができるまでロゴを使う。

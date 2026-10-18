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

### D1（作品の保存先）

作品は Cloudflare D1 に保存する（`DB` バインディング、ORM は Drizzle）。スキーマは `migrations/*.sql` と `src/db/schema.ts` の両方に書き、`src/d1Repository.test.ts` で一致を確かめる。

```sh
pnpm --filter @oricube/api db:migrate:local    # wrangler dev のローカル D1 に適用
pnpm --filter @oricube/api db:migrate:remote   # 本番の D1 に適用（Cloudflare のログインが必要）
```

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
- 画面側は `VITE_CLERK_PUBLISHABLE_KEY`（`apps/web` のビルド時の環境変数）があるときだけログインを有効にする。ログイン画面は Clerk が提供するページへ移動し、画面に Clerk の部品は埋め込まない。未ログインで「投稿」を押すとログイン画面へ移り、ログイン後は作成画面へ戻る（下書きはブラウザに保存済み。戻っただけでは投稿しない）。
- 他サイトからのフォーム送信は `hono/csrf` で拒否する。JSONの書き込みはクロスオリジンだとプリフライトで止まる（CORSは許可しない）。
- フロントは `AppType` を type-only import し、`hono/client` で呼ぶ。
- ページのmeta生成（`src/pages.ts`）は実行環境に依存しない。実行環境ごとの入口は `src/worker.ts`（Cloudflare Workers）と `src/index.ts`（Node.js。CIのスモークテストで使う）。
- 作品の保存先は `OrigamiRepository`（`src/repository.ts`）。Workers では D1（`src/d1Repository.ts`）、Node.js とテストではメモリ上の実装を使う。og:image は作品のサムネイル保存ができるまでロゴを使う。

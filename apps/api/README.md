# @oricube/api

v2のAPI（Hono）と、画面の同一オリジン配信。方針は [#100](https://github.com/ori-cube/OriCube/issues/100) を参照。

## 開発

```sh
pnpm dev:api   # http://localhost:8787/api
pnpm dev:web   # http://localhost:5173 （/api を上のAPIへproxy）
```

## 本番相当の起動（Node.js）

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
| `GET /view/:id` | SPAの `index.html` に作品名・説明のタイトルとOGPを入れて返す。存在しない作品はHTTP 404 |
| `GET /`・`/view`・`/post` | SPAの `index.html` |
| `/assets/*` | ビルド済みの静的ファイル |
| それ以外 | HTTP 404（画面はSPAの404表示、`/api/*` はJSON） |

- APIのエラーは `{ "error": { "code", "message" } }` の形で返す（`invalid_request` 400・`not_found` 404・`payload_too_large` 413・`internal_error` 500）。
- フロントは `AppType` を type-only import し、`hono/client` で呼ぶ。
- ページのmeta生成（`src/pages.ts`）は実行環境に依存しない。Node.js固有なのは `src/index.ts`（起動と静的ファイル）だけで、ホスティング先が決まったらその環境向けの入口を追加する。
- 作品の取得元は保存契約が決まるまでモック（`src/mocks/models.ts`）。認証・投稿・画像保存は、認証サービスとホスティングを決めてから追加する。og:image は作品のサムネイル保存ができるまでロゴを使う。

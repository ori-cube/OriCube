# @oricube/api

v2の画面向けAPI（Hono）。方針は [#100](https://github.com/ori-cube/OriCube/issues/100) を参照。

```sh
pnpm dev:api   # http://localhost:8787/api
pnpm dev:web   # http://localhost:5173 （/api を上のAPIへproxy）
```

| エンドポイント | 内容 |
| --- | --- |
| `GET /api/models/:id` | 作品の取得。保存済みの値も `origamiModelSchema` で検証してから返す |

- エラーは `{ "error": { "code", "message" } }` の形で返す（`invalid_request` 400・`not_found` 404・`payload_too_large` 413・`internal_error` 500）。
- フロントは `AppType` を type-only import し、`hono/client` で呼ぶ。
- 作品の取得元は保存契約が決まるまでモック（`src/repository.ts`）。認証・投稿・画像保存・本番ビルドとデプロイは、認証サービスとホスティングを決めてから追加する。

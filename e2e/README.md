# E2E テスト

ビルド済みの画面（`apps/web/dist`）と API を Node.js で起動し、実際のブラウザ（Playwright の Chromium）で操作する。#100 の完了条件のうち、画面と API を通して確かめるものを置く。

```sh
pnpm build:web
pnpm test:e2e                                    # Playwright のブラウザを使う
E2E_CHROMIUM_PATH=/usr/bin/google-chrome pnpm test:e2e   # 手元の Chrome を使う（CI はこれ）
```

- サーバーは E2E 用の入口 `apps/api/src/e2e.ts` で起動する。Clerk のログインはテストで行えないため、Cookie `e2e_user` の値をログイン中のユーザーIDとして扱う（`signInAs`）。本番の入口とビルドには含めない
- 作品・画像の保存先はメモリ上の実装。テストは同じサーバーを使うので、ファイルは順に実行する
- 折る操作そのもの（ドラッグ）は単体テストで確かめ、E2E では下書き（`localStorage`）に鶴の手順を置いてから始める。サムネイルの撮影は WebGL をソフトウェア描画（SwiftShader）で動かす

| ファイル | 内容 |
| --- | --- |
| `authorization.e2e.ts` | 未ログインの書き込み・所有者以外の更新と削除・所有者のいない作品・他サイトからのフォーム送信を API が拒否する |
| `flows.e2e.ts` | 未ログインの下書きの保存と再開（ログインで他のページへ移っても戻る）、投稿 → 作品ページ（OGP）→ 一覧 → 自分の作品から再編集（同じURLの上書き）→ 削除（404）、URL の直接表示と404 |

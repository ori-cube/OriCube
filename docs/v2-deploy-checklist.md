# v2 デプロイ前の準備（担当: リポジトリ管理者）

v2（`apps/web` + `apps/api`）を Cloudflare Workers に公開する前に、アカウントの操作が必要な作業の一覧。コマンドはリポジトリのルートで実行する（`wrangler login` 済みであること）。

## 1. 旧APIの露出を確認する（最優先）

- [ ] Vercel（Preview を含む）など外部から届く環境で、v1 の `/api/data` が本物の DB・S3 の認証情報付きで動いていないか確認する
- [ ] 動いていれば、少なくとも `POST /api/data` を止める（未認証で任意のメールアドレスとして書き込める）

## 2. Cloudflare D1（作品の保存先）

- [ ] D1 を作る

  ```bash
  pnpm --filter @oricube/api exec wrangler d1 create oricube
  ```

- [ ] 表示された `database_id` を `apps/api/wrangler.jsonc` の `d1_databases[0].database_id`（今は `00000000-...` の仮の値）に設定する。値を共有してもらえれば PR にする
- [ ] テーブルを作る（`apps/api/migrations` の 0001〜0006 が順に適用される）

  ```bash
  pnpm --filter @oricube/api db:migrate:remote
  ```

## 3. Cloudflare Turnstile（bot による投稿を防ぐ）

ログインは無く、投稿のたびに Turnstile で人であることを確かめる。サムネイルはサーバーが手順から描くため、画像の保存先（R2）は要らない。

- [ ] Cloudflare のダッシュボードで Turnstile のウィジェットを作り、公開ドメイン（5. で割り当てるもの）を登録する
- [ ] Worker に秘密鍵を登録する。未設定だと本番の投稿はすべて拒否される

  ```bash
  pnpm --filter @oricube/api exec wrangler secret put TURNSTILE_SECRET_KEY
  ```

- [ ] 画面のビルド時に `VITE_TURNSTILE_SITE_KEY`（サイトキー）を環境変数で渡す（6. のコマンドの実行時）

## 4. 環境変数（任意）

- [ ] OGP の絶対URLを固定したい場合は、`apps/api/wrangler.jsonc` の `vars` か Cloudflare のダッシュボードで `APP_ORIGIN`（例: `https://oricube.example`）を設定する。未設定ならリクエストのオリジンを使う。設定すると、Turnstile のトークンを発行したホスト名もこの値と照らし合わせる

## 5. 公開ドメイン

- [ ] Worker（`oricube`）にカスタムドメインを割り当てる（Cloudflare ダッシュボード → Workers → Settings → Domains & Routes）。Turnstile に登録したドメインと合わせる

## 6. デプロイと確認

- [ ] デプロイする（画面のビルド → Worker の公開）

  ```bash
  VITE_TURNSTILE_SITE_KEY=<サイトキー> pnpm deploy:worker
  ```

- [ ] 公開後に確認する
  - [ ] `/` と `/view/crane` が表示され、`/view/存在しないID` が HTTP 404 になる
  - [ ] `/post` から投稿でき（Turnstile の確認が出る）、作品一覧にサムネイル付きで出る
  - [ ] 投稿したブラウザの「自分の作品」（`/me`）に出て、編集・削除できる
  - [ ] 限定公開で投稿した作品が一覧・検索に出ず、URL では見られる
  - [ ] 作品ページを SNS のカード確認ツールで開き、タイトル・説明・画像が出る

## 7. 切り替え後（v1 の削除と合わせて）

- [ ] Vercel の v1 プロジェクトを止める（v1 の削除 PR のマージ後）
- [ ] Storybook の置き先を決める（今は Vercel の `ori-cube-storybook`。Cloudflare Pages などへ移すか、Vercel を続けるか）
- [ ] v1 のひらがな変換 API（`src/app/api/hiragana`、goo API 依存）を v2 に残すか決める

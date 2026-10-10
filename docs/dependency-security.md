# 依存関係のセキュリティ修正

2026-10-10時点。`minimumReleaseAge`、`trustPolicy`、ビルド許可などの保護は維持する。

## 更新とバージョン固定

- Next.js 15.5.27、NextAuth 4.24.15、Axios 1.20.0、Vitest 4.1.11などを修正版に更新した。
- 未使用の `firebase-admin` と `firestore-export-import` を削除し、公式修正版がない `node-forge` を含む依存経路を除去した。
- `overrides` は古い依存指定を修正版に置き換えるために使用する。監査や信頼性チェックの除外は追加しない。

| override | 理由・検証 |
| --- | --- |
| Next.jsのPostCSS 8.5.23 | Next.jsが固定する旧版の脆弱性を解消。アプリのビルドで検証する。 |
| Vite 7.3.5、esbuild 0.28.1 | 開発サーバーのファイル読み取り問題を解消。Storybookのビルドで検証する。 |
| Storybookのmocker 4.1.11 | 3系にはファイル読み取り問題の修正版がない。Storybookのブラウザテストで互換性を確認する。 |
| postcss-selector-parser 7.1.6、tmp 0.2.7 | 親の旧版指定を超えてDoS・パストラバーサルを修正。ビルド・Lint・コミットフックで検証する。 |
| jose 5.10.0、semver 7.8.5 | 4系jose・6系semverの解決候補が信頼性チェックに拒否されたため、保護を満たす版を選択。JWTテストとLintで検証する。 |
| eslint-import-resolver-typescript 3.10.0 | 3.10.1が信頼性チェックに拒否されたため、親の互換範囲内で保護を満たす版を選択した。 |

## bracesの公式修正版が出るまで

[`GHSA-vfj7-8cjw-p6xm`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)は `braces` 3.0.3までの深い入れ子によるスタック枯渇を報告している。公式修正版は未公開。

`patches/braces@3.0.3.patch` を全依存経路に適用する。パーサーで深さを制限し、compile・expand・stringifyでは外部ASTも反復走査で検査する。100を超える深さは再帰処理前に `SyntaxError` で拒否する。通常の展開・範囲指定・エスケープの互換性も `pnpm test:security` で確認する。

`pnpm audit` はパッチの内容を評価しないため、適用後もこのHigh警告1件を出し、終了コード1になる。警告は隠さず、パッチ適用と回帰テストの成功を別々に確認する。公式修正版の公開後は保護と互換性を確認し、バージョン更新とパッチ削除を同じ変更で行う。

```sh
pnpm install --frozen-lockfile
pnpm test:security
pnpm audit
```

# @oricube/engine

折り紙の計算・データ型・編集用から再生用への変換をまとめたパッケージ。投稿画面・閲覧画面・API（予定）から共通で使う。

- React・DOM・Hono・ルーティングに依存しない。`three` は `Vector3` などの数学型としてのみ使う（`tsconfig.json` は DOM の型を読み込まない）。
- メッシュ生成・シーン・アニメーションなどの描画処理は画面側（`src/components/v2`）に置く。
- 方針は [#100](https://github.com/ori-cube/OriCube/issues/100) を参照。

| パス | 内容 |
| --- | --- |
| `src/model-v2.ts` | v2投稿データ（答え形式＋履歴）の型 |
| `src/types.ts` | 編集中の板・折り線・折り操作の型 |
| `src/utils/*` | 折りの適用・リプレイ・履歴・吸着・答え形式へのエクスポート |
| `src/playback.ts` | 答え形式から閲覧用タイムラインと各時点の板を求める |

```sh
pnpm --filter @oricube/engine typecheck
pnpm exec vitest run packages/engine
```

# 11 投稿データ化（v2 答え形式エクスポート）

折り手順を保存・閲覧につなぐレイヤー。**内部はジェスチャ履歴＋ソルバのまま、保存時に「答え形式」へエクスポートする**という方針に基づく。

```
ドラッグ入力 ──> ジェスチャ履歴 OrigamiStep[]（唯一の状態源）
                    │ リプレイ（ソルバ: fold / squash / petal）
                    v
               片・軸・レイヤーの幾何 ──保存時──> 答え形式＋履歴を Model.procedure へ
                                                      │
                                             閲覧側: θ回転で再生するだけ（ソルバ不要）
```

- **保存が楽**: ソルバがリプレイで全幾何を計算済み。保存はその結果を書き出すエクスポータ1本
- **閲覧が楽**: 答えデータを頂点ごと軸方式で回すだけ（旧 convolution 再生と同型）。閲覧はソルバに依存しない
- **保存形式は「答え形式＋ジェスチャ履歴」の両方**。履歴はほぼゼロコストで、将来の再編集・ソルバ改良時の再エクスポートを可能にする
- 旧形式（`src/types/model.ts` の `Procedure`）との互換性はない。旧 convolution のデータは手書きモックのみで、投稿 UI から作られたことはない

## v2 答え形式 — ProcedureV2

`src/types/model-v2.ts` に定義。旧 convolution の「動く頂点ごとに1軸」を、**動く板の頂点ごとに軸の列（0〜2本）を同一角度 θ で順に適用**する形へ一般化した（squash の openRotate・petal のサイド片は合成回転のため1軸では表現できない。0本 = 不動）。

- 1ステップ = `{ kind, fixBoards, moveBoards, foldLines }`。moveBoard は `{ polygon, layer, vertexAxes }` を持ち、閲覧側はソルバなしで θ 回転の再生だけで折り手順を表示できる（レイヤーは Z オフセット用）
- `ProcedureV2 = { version: 2, size, steps, finalBoards, history }`。ジェスチャ履歴（`HistoryStepV2`、`THREE.Vector3` → `[x, y, z]`）も一緒に保存する
- `Model.procedure`（Prisma の JSON カラム）にこの形式で保存する想定

## エクスポータ — exportProcedureV2

`utils/exportProcedureV2`（純関数・テスト付き）。履歴をリプレイしながら各ステップの答えデータを書き出す。適用できないステップがあれば null（履歴は検証済みのため通常起こらない）。

- 通常の折り: 全ての動く板の全頂点が折り線周りの単一回転
- squash / petal: アニメーションと同じ分類で頂点ごとの軸の列を書き出す
- テストの核: 鶴の基本形までの5ステップについて、**各ステップを θ=π まで再生した結果がリプレイの次状態と一致**することを検証

## アニメーションとの分類共有

**回転軸の分類はアニメーション（`useFoldAnimation`）と同じ関数を使う**ため、投稿時に見た動きと保存データの再生が必ず一致する。このための共有構造:

- `utils/vertexAxes`: `VertexAxis`（軸の点＋向き付き方向）と `applyVertexAxes`（軸の列を θ で順に適用）
- `computeSquashAnimationPositions` は `deriveSquashRotationAxes`（軸の導出）+ `collectSquashVertexAxes`（頂点ごとの分類）+ 再生に分離。petal も同様（`derivePetalRotationAxes` / `collectPetalVertexAxes`）

## 今後（未実装）

- **v2 閲覧の再生**: `OrigamiDetailV2` を v2 答え形式（軸の列）対応に拡張。`foldProgress` による θ 再生の仕組みは実装済みなので、convolution 分岐の一般化が主な作業
- **投稿フロー**: 投稿ボタン・モデル名の入力・サムネイル取得などの UI と、`exportProcedureV2` の結果を既存 `POST /api/data` へ送る接続

## 関連ソース

| パス | 役割 |
| --- | --- |
| `src/types/model-v2.ts` | v2 投稿データ（答え形式＋履歴）の型定義 |
| `utils/exportProcedureV2/index.ts` | 履歴 → 答え形式のエクスポータ |
| `utils/vertexAxes/index.ts` | 頂点ごとの回転軸の表現と適用（アニメーションと保存で共通） |
| `utils/computeSquashAnimationPositions/index.ts` | squash の軸導出・頂点分類（エクスポートと共有） |
| `utils/computePetalAnimationPositions/index.ts` | petal の軸導出・頂点分類（エクスポートと共有） |
| `src/app/api/data/route.ts` | 既存の投稿 API（`Model.procedure` は JSON カラム） |

# 05 複数枚対象時の挙動と枚数選択

折りを重ねると複数の板が同じ位置に頂点を持つようになる。このとき「何枚まとめて折るか」をどう決めるかを説明する。

## 折りのセマンティクス

ドラッグした頂点（dragVertex）を起点に折る対象を決める:

1. 頂点が1枚の板にのみ属する場合 → その1枚だけを折る（選択なしの即時フロー)
2. 複数の板が同じ位置に頂点を持つ場合 → 視点側から数えて先頭 `foldCount` 枚を折る。`foldCount` は折りが成立する枚数が1通りならその値で即折り、複数通りならユーザーが選ぶ

「視点側から `foldCount` 枚」という連続した束だけが対象になる。間を飛ばして折ることはできない（物理的に紙をつまむ動作の再現）。

## スナップポイントの集約 — collectSnapPoints

全板の頂点を XY 平面上の距離 `SNAP_MERGE_TOLERANCE`（0.1）以内でグループ化し、`{ position, boardCount }` の一覧にする。重なった頂点はシーン上では1つのスナップポイントとして描画され、ユーザーは「その位置」を掴む（特定の1枚を掴むのではない）。`boardCount` が折る枚数の上限になる。

`SNAP_MERGE_TOLERANCE` は「同一頂点」の判定閾値としてコンポーネント全体で共有されており、`applyFoldStep` の候補板検索（`hasVertexAt`）や破れ判定の距離比較も同じ値を使う。

## 候補板の並び順 — findFoldCandidates

dragVertex に頂点を持つ板を**視点に近い順**に並べる。表から見ていれば layer 降順、裏からなら layer 昇順。「上から n 枚折る」の「上」が視点によって反転するため。

## 表裏の視点 — viewFront

どちら側から見て折っているかは、**ドロップ時のカメラ位置の z の符号**で判定する（`viewFront = camera.position.z > 0`）。裏返し機能（`useFlipView`）はカメラを回すだけで折り紙のデータを変更しないため、この判定で自然に裏側からの折りになる。

`viewFront` は `FoldStep` に記録され、以降の処理（候補の並び順・動く片の持ち上げ方向・レイヤーの積み先）はすべてこの値を参照する。リプレイがカメラに依存せず決定的になるのはこのため。

| | 表折り（viewFront=true） | 裏折り（viewFront=false） |
| --- | --- | --- |
| 候補の並び | layer 降順 | layer 昇順 |
| 動く片の持ち上げ方向 | +Z 側 | -Z 側 |
| 動く片の積み先 | 最大レイヤーの上 | 最小レイヤーの下 |

## ドロップ時の分岐フロー（useDropHandler）

```
mouseup
  → calculateFoldLine（折り線が引けなければ何もしない）
  → findFoldCandidates（候補0枚なら何もしない）
  → collectValidCounts: 1〜候補数の各枚数について折りの成立を事前検証
      成立枚数 0 通り → 何もしない（idleのまま再ドラッグを待つ）
      成立枚数 1 通り → その枚数で commenceFold → folding へ（選択させない）
      成立枚数 複数通り → 折り線をプレビュー表示し、FoldProposal を保存 → selecting へ
```

事前検証は「その枚数で `applyFoldStep` を実際に実行して null でないか」を試すだけ。分割不可・破れ判定（[06](./06-tear-prevention.md)）による不成立がここで除外されるため、「候補は3枚あるが折れるのは1枚だけ」のようなケースでは選択 UI を出さず即折りになる。

## 枚数選択（selecting フェーズ）

- 折り線は**全候補を覆うスパン**でプレビュー表示する（何枚選んでも折り線の位置関係が視覚的に分かるように）
- `FoldCountSelector` がキャンバス下部にカードを表示。成立しない枚数のボタンは無効化され、デフォルトは選択できる最小の枚数
- 「折る」→ `confirmFold(count)`（`useDragDrop`）が `commenceFold` を呼んで folding へ
- 「キャンセル」→ `cancelFold()` が折り線を消して idle へ
- selecting 中はドラッグ&ドロップと Undo/Redo は無効

`commenceFold` は折りの確定処理（対象板でのスパン再計算 → `applyFoldStep` → 折り線可視化 → シーン差し替え）の共通関数で、即時フローと枚数選択後の両方から呼ばれる。確定時のスパンは選択された枚数の対象板だけで計算し直すため、プレビューより短くなることがある。

## 関連ソース

| パス | 役割 |
| --- | --- |
| `utils/collectSnapPoints/index.ts` | 頂点の集約と `SNAP_MERGE_TOLERANCE` の定義 |
| `utils/applyFoldStep/index.ts` | `findFoldCandidates`（候補板の視点順ソート） |
| `hooks/useDragDrop/useDropHandler.tsx` | `collectValidCounts` と即折り / 枚数選択の分岐 |
| `hooks/useDragDrop/commenceFold.ts` | 折りの確定処理（両フロー共通） |
| `hooks/useDragDrop/index.tsx` | `confirmFold` / `cancelFold` |
| `FoldCountSelector/index.tsx` | 枚数選択カード UI |

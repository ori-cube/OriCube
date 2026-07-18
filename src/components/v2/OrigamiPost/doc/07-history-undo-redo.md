# 07 履歴と Undo / Redo

Undo/Redo は「板の状態を巻き戻す」のではなく、「適用する折り手順の数を増減する」ことで実現している。[02 データモデル](./02-data-model.md) の「履歴が唯一の状態源」という原則の直接の帰結。

## データ構造 — FoldHistory

```typescript
interface FoldHistory {
  steps: FoldStep[]; // 折り操作の全履歴
  index: number;     // 適用済みのステップ数（0 <= index <= steps.length）
}
```

`utils/foldHistory/index.ts` にすべて純関数として定義されている:

| 関数 | 動作 |
| --- | --- |
| `appliedFoldSteps` | `steps.slice(0, index)` — リプレイに渡す適用済みステップ |
| `pushFoldStep` | `index` より先（Redo 対象）を**破棄**して新ステップを積み、`index` を +1 |
| `undoFoldStep` | `index` を -1 するだけ。`steps` は保持（Redo で再適用できる） |
| `redoFoldStep` | `index` を +1 するだけ |
| `canUndo` / `canRedo` | `index > 0` / `index < steps.length` |

Undo で戻った位置から新しく折ると先の履歴は破棄される（一般的なエディタと同じ分岐なしの線形履歴）。

## 形状の導出

```typescript
// index.tsx
const currentBoards = useMemo(
  () => replayFoldSteps(initialBoard, appliedFoldSteps(foldHistory)),
  [initialBoard, foldHistory]
);
```

Undo/Redo のたびに `foldHistory` が変わり、`currentBoards` が初期正方形からのリプレイで再計算され、`useRenderBoards` が描画し直す。専用の巻き戻し処理は存在しない。

この方式の性質:

- **誤差が蓄積しない**: 常に初期状態から再計算するため、Undo → Redo を何度繰り返してもビット単位で同じ形状に戻る。逆演算（-180 度回転など）で巻き戻す方式だと浮動小数の誤差が往復ごとに積もる
- **スナップショット不要**: 保存するのは `FoldStep`（折り線・頂点・枚数・視点）だけで、板の座標列は持たない
- **リプレイは決定的**: `FoldStep` はカメラ等の外部状態に依存しない（[02](./02-data-model.md)）

計算量は折り数に比例するが、1ステップの適用は板数 × 頂点数程度の軽い幾何計算であり、人間が折れる回数の範囲では問題にならない。

## 履歴への確定タイミング

折りが履歴に積まれるのは**アニメーション完了時**（`completeFold`）。ドロップ直後は `PendingFold` として保留され、`foldPhase` が folding の間はまだ履歴に入っていない。このため:

- アニメーション中に Undo される心配がない（idle 以外では Undo/Redo ボタンが無効）
- 履歴には `applyFoldStep` が成功したステップだけが積まれる（`replayFoldSteps` がリプレイ中に null に遭遇した場合はそこで打ち切る防御的処理があるが、通常は起こらない）

## UI — Toolbar

キャンバス左上の縦ツールバーに Undo / Redo / 裏返しボタンを表示する。活性条件は `index.tsx` が計算して渡す: `foldPhase === "idle" && !isFlipping && canUndo(foldHistory)`（Redo も同様）。

## 関連ソース

| パス | 役割 |
| --- | --- |
| `utils/foldHistory/index.ts` | `FoldHistory` と全履歴操作（純関数） |
| `utils/replayFoldSteps/index.ts` | 適用済みステップのリプレイ |
| `index.tsx` | `foldHistory` 状態、`completeFold` / `handleUndo` / `handleRedo` |
| `Toolbar/index.tsx` | Undo / Redo / 裏返しボタン |

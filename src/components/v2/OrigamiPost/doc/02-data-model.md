# 02 データモデルと履歴リプレイ

型定義はすべて `types.ts` にある。

## 2つの座標空間

このコンポーネントは板を**2つの空間**で同時に持つ。この区別がデータモデル全体の鍵になる。

- **折り畳み空間**: 折った後の現在の見た目の座標。XY 平面上（z=0）で持ち、重なりは座標ではなく `layer` で表現する
- **展開図空間**: 折る前の初期正方形の座標系。折りで回転・鏡映されず、分割で細分されるだけ

## 型の階層

```
Board = THREE.Vector3[]          順序付き頂点列の多角形。初期は正方形、折るたびに任意の多角形になる

BoardPiece                       2空間のポリゴンの組
├── polygon: Board                 折り畳み空間（XY平面上）
└── sourcePolygon: Board           展開図空間（初期正方形の座標系）

LayeredBoard extends BoardPiece  シーンに存在する1枚の板
└── layer: number                  重なり順。大きいほど表側（+Z側）

FoldLine = { start, end }        折り線。無限直線として扱い、start/endは表示・分割入力用のスパン

OrigamiStep                      折り手順の履歴の1要素（kindで判別するユニオン）
├── FoldStep    (kind: "fold")     通常の折り
└── SquashFoldStep (kind: "squash") 開いて畳む（スクワッシュフォールド）
```

`polygon` と `sourcePolygon` は同じ長さで、**インデックス i の頂点同士が紙上の同一点に対応する**。この対応は `separateBoard` が両者を同じ補間比率でロックステップ分割することで維持される（[04 折りの実行ロジック](./04-fold-execution.md)）。

`sourcePolygon` を持つ目的は破れ判定である。紙は展開図上では連続体なので、「2つの板が物理的につながっている（折り目がある）⟺ 展開図上で正の長さの境界線分を共有する」と正確に判定できる（[06 破れ防止](./06-tear-prevention.md)）。また展開図座標は回転・鏡映を受けないため、何回折っても誤差が蓄積しない。

`layer` は折るたびに再割り当てされるため連番とは限らず、負の値も取り得る（裏折りは最小レイヤーの下に積むため）。描画時は `z = layer * BOARD_LAYER_OFFSET` で浮かせて立体感と z-fighting 回避を両立する（`constants.ts`）。

## OrigamiStep — 1回の折り操作

```typescript
interface FoldStep {
  kind: "fold";
  foldLine: FoldLine;        // 折り線
  dragVertex: THREE.Vector3; // ドラッグした頂点の元位置（折る板の特定と動く側の判定に使用）
  foldCount: number;         // 折る枚数（頂点を共有する板のうち視点側から数えて何枚折るか）
  viewFront: boolean;        // 折ったときに表側（+Z側）から見ていたか
}

interface SquashFoldStep {
  kind: "squash";
  foldLine: FoldLine;        // 折り線
  dragVertex: THREE.Vector3; // ドラッグした頂点の元位置（フラップの特定と動く側の判定に使用）
  viewFront: boolean;        // 折ったときに表側（+Z側）から見ていたか
}

type OrigamiStep = FoldStep | SquashFoldStep;
```

初期状態の正方形に `OrigamiStep` を順に適用すれば現在の形状を再現できる、**最小限の情報**だけを持つ。板の座標そのものは含まないことに注意。カメラ位置にも依存しない（視点は `viewFront` として折った時点で記録済み）ため、リプレイは決定的になる。

`SquashFoldStep`（[09 開いて畳む](./09-squash-fold.md)）も同じ原則に従い、対象のフラップやヒンジ等の幾何はリプレイ時に板群から再導出する。`foldCount` を持たないのは対象が常に視点側2枚だから。

## 設計原則: 履歴が唯一の状態源

現在の板群を状態として持たず、履歴のリプレイで毎回導出する。

```typescript
// index.tsx
const currentBoards = useMemo(
  () => replayFoldSteps(initialBoard, appliedFoldSteps(foldHistory)),
  [initialBoard, foldHistory]
);
```

`replayFoldSteps`（`utils/replayFoldSteps/index.ts`）は初期正方形を `LayeredBoard`（layer=0、`sourcePolygon` は `polygon` のコピー）に包み、各ステップを `kind` で適用関数（`applyFoldStep` / `applySquashFoldStep`）へ振り分けて順に適用するだけの純関数。

この設計を採る理由:

1. **誤差が蓄積しない** — 常に初期状態から再計算するため、Undo/Redo を何度繰り返しても浮動小数の誤差が積み上がらない
2. **Undo/Redo が自明になる** — 適用するステップ数を増減するだけで実現できる（[07 履歴と Undo/Redo](./07-history-undo-redo.md)）
3. **投稿データ化の基礎** — 折り方を `FoldStep[]` としてそのまま保存・再生できる

`sourcePolygon` や `layer` はリプレイ中に導出される状態であり、履歴には含まれない。

## 関連ソース

| パス | 役割 |
| --- | --- |
| `types.ts` | `Board` / `FoldLine` / `BoardPiece` / `LayeredBoard` / `OrigamiStep`（`FoldStep` / `SquashFoldStep`）の定義 |
| `constants.ts` | `BOARD_LAYER_OFFSET`（レイヤー1つ分の描画Zオフセット） |
| `utils/replayFoldSteps/index.ts` | 履歴のリプレイによる現在の板群の導出（`kind` による振り分け） |
| `utils/createSquareBoard/index.ts` | 初期状態の正方形 `Board` の生成 |
| `utils/applyFoldStep/index.ts` | 通常の折り1ステップの適用（[04](./04-fold-execution.md) 参照） |
| `utils/applySquashFoldStep/index.ts` | 開いて畳む1ステップの適用（[09](./09-squash-fold.md) 参照） |

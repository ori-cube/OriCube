# 09 開いて畳む（スクワッシュフォールド）

鶴の正方基本形を作る操作のように、折り目でつながった2枚のフラップを開いて平らに畳む操作。通常の折り（[04](./04-fold-execution.md)）は動く片すべてが1本の折り線での鏡映という**同一の変換**を受けるのに対し、開いて畳むでは動く3片が**別々の変換**を受ける。この違いが成立条件・破れ判定・アニメーションのすべてに波及する。

対応範囲は**基本ケース限定**（1つのポケットを対称に開いて平らに畳む）。閲覧機能では `ConvolutionStep` として再現済みの操作を、投稿側でも作れるようにしたもの。

## 用語

三角形に2回折った後、頂点 V を反対側へドラッグする例で:

- **フラップ**: dragVertex V に頂点を持つ視点側2枚（手前 = X、奥 = Y）
- **スパイン**: X と Y が共有する折り目 V–A。A はその反対側の端点（`spineApex`）
- **ヒンジ h**: Y と固定側の板が共有する折り目（A を通る直線）
- **折り線 L**: 通常の折りと同じ、ドラッグの垂直二等分線（[03](./03-drag-and-fold-line.md)）

## 成立条件 — applySquashFoldStep

`applySquashFoldStep`（`utils/applySquashFoldStep/index.ts`）が「現在の板群 + `SquashFoldStep` → 折り後の板群」を計算する純関数で、以下をすべて満たさない場合は null（不成立）を返す:

1. 候補（V に頂点を持つ板）が2枚以上あり、視点側の先頭2枚をフラップ X・Y とする
2. **スパイン検出（`detectSpineApex`）**: X と Y の展開図上の共有折り目がちょうど1本で、折り畳み空間で一端が V に一致し、他端 A が折り線 L 上にある（A が L 上にないと平らに畳めない）。V 自体は L 上にない
3. **ヒンジ検出（`detectHinge`）**: Y と固定側の板の共有折り目の端点がすべて、A を通る1本の直線 h 上に載っている。h と L が平行（同一直線）なら不成立（開く動きにならず、通常の折りで表現できる）。複数ポケットや非対称な開きはここで弾かれる = 基本ケース限定の実体
4. **接続検証（`isConnectivityPreserved`）**: 4片に下記の変換を適用した**最終状態**で、全ての片のペアの共有折り目が折り畳み空間でも一致する（後述）

共有折り目の検出はすべて展開図連結性（`findSharedSourceSegments`、[06](./06-tear-prevention.md)）で行い、折り畳み空間への写像に `mapSourceBoundaryPointToFolded` の頂点対応を使う。

## 4片の変換とレイヤー

X・Y をそれぞれ折り線 L で分割し、4片のうち3片が動く（表折り、M = 現在の最大レイヤー）:

| 片 | motion | 変換 | 最終レイヤー |
| --- | --- | --- | --- |
| X の固定片 | —（動かない） | 不動 | X.layer |
| X の V 側 | `mirrorFoldLine` | L で鏡映 | M+3 |
| Y の V 側 | `openRotate` | L で鏡映 → h で鏡映（ポケットが開く部分） | M+2 |
| Y の反対側 | `mirrorHinge` | h で鏡映（ヒンジ周りに180度回転） | M+1 |

裏折り（viewFront=false）は最小レイヤーの下へ min−1..−3 に対称に積む。動く片はヒンジ側の片から順に視点側の外側へ積む。

接続の整合性は「スパイン（L 側の端点 A）⊂ h」かつ「L 上の点は L の鏡映で不動」という幾何的性質で保たれ、条件4がそれを数値検証する。

## 破れ判定の一般化 — staysAttached

通常の折りの `isTearingFold`（[06](./06-tear-prevention.md)）は「動く片はすべて同一の変換を受ける」前提があるため、「共有折り目が折り線上にあるか」だけを見れば済んだ。開いて畳むでは3片が別々の変換を受けるためこの前提が崩れる。

そこで `staysAttached` は、2片が展開図上で共有する折り目の**各端点を、両方の片の頂点対応でそれぞれ折り畳み空間へ写像し、両者が一致するか**を直接検証する。これは破れ判定を「片ごとに異なる変換」へ一般化したもので、スパイン・カット辺・ヒンジ・想定外の接続をひとつのルールでまとめて検証できる。動かない板同士は座標が変わらないため検証不要。

## データモデルと履歴

履歴要素は判別可能ユニオン `OrigamiStep = FoldStep | SquashFoldStep`（`kind: "fold" | "squash"`、[02](./02-data-model.md)）。`SquashFoldStep` はジェスチャの最小情報（`foldLine` / `dragVertex` / `viewFront`）のみを持ち、フラップ・スパイン・ヒンジ・4片の幾何はリプレイ時に `applySquashFoldStep` が板群から再導出する。`foldCount` を持たないのは対象が常に視点側2枚だから。

`replayFoldSteps` が `kind` で適用関数を振り分けるため、Undo/Redo は履歴の仕組みそのままで動く（[07](./07-history-undo-redo.md)）。

## 発動 UX — 枚数選択への統合

典型的な開いて畳むジェスチャでは、**通常の折り（2枚折り・4枚折りなど）も同時に成立する**。スパインは動く片同士の共有折り目なので通常の折りでも破れないため。したがって「通常の折りが全滅した時だけ発動」は成立せず、枚数選択に統合した（`useDropHandler`）:

- 通常の折りが全滅かつ開いて畳むのみ成立 → 選択させず即実行
- 両方成立 → `FoldCountSelector` に「開いて畳む」の選択肢を追加して selecting へ
- 従来は枚数1通りで即折りだったドロップも、開いて畳むが成立する場合は選択カードを出す（挙動変更）

分岐フローの全体は [05](./05-multi-board-folding.md) を参照。

## アニメーション — 頂点ごと軸方式

動く3片は別々の軸（L・h・その合成）で回転するため、通常の折りの単一ピボット Group（[08](./08-rendering-animation.md)）では表現できない。閲覧機能の `convolution` と同じ**頂点ごと軸方式**を採る（`computeSquashAnimationPositions`）: 全頂点が同一角度 θ（0→π）で自分の回転軸周りに回転する。

頂点の分類（順に判定）:

| 片の motion | 頂点の位置 | 動き |
| --- | --- | --- |
| `mirrorFoldLine` | L 上 / それ以外 | 不動 / L 周りに回転 |
| `mirrorHinge` | h 上 / それ以外 | 不動 / h 周りに回転 |
| `openRotate` | h 上 / L 上 / スパイン上 / それ以外 | 不動 / h 周り / L 周り / L → h の合成回転 |

片は途中経過では厳密な剛体ではないが、**隣り合う片と共有する辺の頂点が同じ動きに分類される**ため、見た目上つながったまま開いて畳まれる。

メッシュは `createMorphBoardMesh`（三角形分割は作成時に1回、毎フレーム position 属性のみ書き換え）を使い、`useFoldAnimation` の squash 分岐が毎フレーム頂点座標を更新する。ヒンジ線は `visualizeFoldLine` の name/color オプションで折り線（赤）と別色（オレンジ）で表示する。

## 既知の制限・将来

- フラップは視点側2枚固定。3枚以上を同時に開く深いスカッシュ（鶴の基本形以降の操作）は成立条件3・4で弾かれ発動しない
- `SquashFoldStepResult.movingPieces`（片ごとの回転前/確定後座標の組）は、閲覧機能の `ConvolutionStep`（nodes / moveNodesIdx / rotateAxes）への変換にそのまま使える構造にしてある（投稿データ化は未実装）

## 関連ソース

| パス | 役割 |
| --- | --- |
| `utils/applySquashFoldStep/index.ts` | 適用の中核。成立条件・4片の変換・`buildSquashFoldStep` / `staysAttached` |
| `utils/computeSquashAnimationPositions/index.ts` | 頂点ごと軸方式の途中経過座標の計算 |
| `utils/createMorphBoardMesh/index.ts` | 頂点を毎フレーム動かせるモーフ板メッシュ |
| `hooks/useDragDrop/commenceSquashFold.ts` | 確定処理とアニメーション用シーン差し替え |
| `hooks/useDragDrop/useDropHandler.tsx` | 発動判定と即実行 / 選択の分岐 |
| `hooks/useFoldAnimation/index.tsx` | squash 分岐（モーフ板の毎フレーム更新） |
| `FoldCountSelector/index.tsx` | 「開いて畳む」の選択肢 |
| `types.ts` | `SquashFoldStep` の定義 |

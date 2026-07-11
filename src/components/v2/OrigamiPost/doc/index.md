# OrigamiPost 折り紙折り動作実装方針

## 概要

Three.js を使用して折り紙の折り動作を再現するコンポーネント。ユーザーのドラッグ操作から折り線の計算、実際の折り動作までを段階的に実装する。

## 現在の進捗状況

| ステップ | 機能                                                      | 状態            |
| -------- | --------------------------------------------------------- | --------------- |
| 1        | ドラッグ&ドロップ操作                                     | ✅ 完了         |
| 2-1      | 折り線の基礎計算 (`calculateFoldLine`)                    | ✅ 完了         |
| 2-2      | 折り線と境界の交点計算 (`calculateFoldLineIntersections`) | ✅ 完了         |
| 2-3      | 折り線の可視化 (`visualizeFoldLine`)                      | ✅ 完了         |
| 2-4      | useDropHandler への統合                                   | ✅ 完了         |
| 3-0      | バグ修正（スナップポイント蓄積）・フェーズ管理の下地      | ✅ 完了         |
| 3-1      | 板の分割ロジック (`separateBoard`)                        | ✅ 完了         |
| 3-2      | 板の分割描画（drop 時のシーン差し替え）                   | ✅ 完了         |
| 3-3      | 180 度折りアニメーション                                  | ✅ 完了         |
| 4-1      | 複数板・レイヤー対応の折り計算ロジック                    | ✅ 完了         |
| 4-2      | 複数回折り（折り完了後に再度折れる）                      | ✅ 完了         |
| 4-3      | 折る枚数の選択 UI                                         | ✅ 完了         |
| 4-4      | Undo / Redo + ツールバー                                  | ✅ 完了         |
| 4-5      | 裏返し（視点 180 度回転）                                 | ✅ 完了         |
| 4-6      | 破れ防止（展開図連結性）                                  | ✅ 完了         |
| 4-7      | ドラッグ中の頂点スナップ（吸着）                          | ✅ 完了         |
| 4-8      | 開いて畳む（スクワッシュフォールド）                      | ✅ 完了         |
| 5-1      | 花弁折りソルバ (`applyPetalFoldStep`)                     | ✅ 完了         |
| 5-2      | 花弁折りの発動 UX・アニメーション                         | ✅ 完了         |
| 5-3      | 投稿データ化（答え形式＋ジェスチャ履歴のエクスポート）    | ✅ 完了         |
| 5-4      | v2 閲覧の再生                                             | 🔄 予定         |
| 5-5      | 投稿フロー（保存 UI・API 接続）                           | 🔄 予定         |
| 5-6      | 既存の折り目に沿って畳む折り（板を分割しない折り）        | ✅ 完了         |

## 実装手順

### 1. ユーザー操作（ドラッグ&ドロップ）

**目的**: ユーザーが折り紙の頂点をドラッグして、折りたい方向を指定する

**実装内容**:

- Three.js の PlaneGeometry で作成した正方形の板（折り紙）を表示 ✅
- 各頂点にドラッグ可能なマーカー（赤い点）を配置 ✅
- マウス/タッチイベントでドラッグ操作を検知 ✅
- ドラッグ中の視覚的フィードバック（頂点の移動） ✅

**現在の実装状況**:

- 基本的なドラッグ&ドロップ機能は実装済み ✅
- ドラッグ中の点の移動は正常に動作 ✅
- 折り線計算への橋渡し処理を実装予定

**技術的詳細**:

**アーキテクチャ**:

- `useDragDrop`: ドラッグ&ドロップ機能の統合管理
  - `useInitialRender`: 折り紙とスナップポイントの初期描画
  - `useDragHandler`: ドラッグ開始・移動処理
  - `useDropHandler`: ドラッグ終了処理

**責務分担**:

1. **初期描画（useInitialRender）**

   - 折り紙の板（PlaneGeometry）をシーンに配置
   - 4 つの頂点にスナップポイント（青い球体）を配置
   - ドラッグ中の点は描画から除外

2. **ドラッグ処理（useDragHandler）**

   - マウスダウン時にレイキャスターでスナップポイントとの交差を検出
   - ドラッグ開始時に点を赤色で表示
   - マウス移動時に地面との交差で点の位置を更新

3. **ドロップ処理（useDropHandler）**
   - マウスアップ時に折り線を計算
   - `calculateFoldLine`で折り線の基礎情報を取得
   - `calculateFoldLineIntersections`で境界との交点を計算
   - `visualizeFoldLine`で折り線を可視化
   - 折り線情報を状態として保存
   - ドラッグ状態をリセット
   - ドラッグ中の点をシーンから削除

**状態管理**:

- `draggedPoint`: 現在ドラッグ中の頂点の座標
- `isDragging`: ドラッグ状態のフラグ
- `originalPoint`: ドラッグ開始時の元の点の位置
- `foldLineState`: 計算された折り線の情報

### 2. 折り線の計算

**目的**: ドラッグ操作から折り線の位置と方向を数学的に計算する

**実装状況**: ✅ 完了

**計算ロジック**:

- 折り紙の配置: **XY 平面**上（Z=0）
- ドラッグ前の頂点位置: `P1(x1, y1, z1)`
- ドラッグ後の頂点位置: `P2(x2, y2, z2)`
- 中点: `M = (P1 + P2) / 2`
- ドラッグ方向ベクトル: `V = P2 - P1`
- 折り紙の法線ベクトル: `N = (0, 0, 1)` （Z 軸方向、XY 平面の法線）
- 折り線の方向ベクトル: `L = V × N`（外積）
- 折り線は点`M`を通り、方向ベクトル`L`を持つ直線として定義

**実装済み機能** ✅:

1. **基礎計算関数**: `calculateFoldLine(p1, p2)`

   - 場所: `utils/calculateFoldLine/index.ts`
   - 入力: ドラッグ前後の 2 点 (`p1`, `p2`)
   - 出力: `{ midpoint, direction }` （中点と折り線の方向ベクトル）
   - Three.js の組み込みメソッド活用で効率的に計算
   - エッジケース対応: 同じ点の場合は`null`を返す

2. **折り線と折り紙境界の交点計算**: `calculateFoldLineIntersections`

   - 場所: `utils/calculateFoldLineIntersections/index.ts`
   - 入力: 折り線情報 (`midpoint`, `direction`)、折り紙のサイズ (`size`)
   - 処理:

   1. 折り紙の 4 辺を線分として定義（XY 平面上、Z=0）
   2. 折り線（無限直線）と各辺（線分）の交点を計算
   3. 重複する交点を除去（折り線が頂点を通る場合）
   4. 折り紙の境界上に存在する 2 つの交点を抽出
   5. 交点がちょうど 2 点でない場合はエラー

   - 出力: 折り線の始点・終点 (`start`, `end`)

3. **折り線の可視化**: `visualizeFoldLine`
   - 場所: `utils/visualizeFoldLine/index.ts`
   - 入力: シーン、始点、終点
   - 実装: 円柱ジオメトリで折り線を描画
     - 2 点間の距離を計算して円柱の高さを決定
     - 中点に配置し、start→end の方向に回転
     - 既存の折り線があれば自動的に削除
   - カスタマイズ: 色（デフォルト: 赤）、半径（デフォルト: 0.5）

**実装の流れ** ✅:

```typescript
// useDropHandlerで実装済み
const handleMouseUp = () => {
  if (!isDragging || !draggedPointMesh || !originalPoint) return;

  // 1. ドラッグ終了地点を取得
  const finalPoint = draggedPointMesh.position.clone();

  // 2. 折り線の基礎情報を計算
  const foldLine = calculateFoldLine(originalPoint, finalPoint);
  if (!foldLine) {
    console.warn("Invalid fold line: start and end points are the same");
    return;
  }

  // 3. 折り紙境界との交点を計算
  const intersections = calculateFoldLineIntersections(
    foldLine.midpoint,
    foldLine.direction,
    size
  );

  // 4. 折り線を可視化
  visualizeFoldLine(scene, intersections.start, intersections.end);

  // 5. 折り線情報を状態として保存
  setFoldLineState({
    midpoint: foldLine.midpoint,
    direction: foldLine.direction,
    start: intersections.start,
    end: intersections.end,
  });

  // 6. ドラッグ状態をリセット
  // ...
};
```

**重要な実装ポイント**:

1. **座標系の統一**: 折り紙は XY 平面上（Z=0）に配置
2. **エラーハンドリング**: 同じ点、交点が 2 点でない場合の処理
3. **重複除去**: 折り線が頂点を通る場合の重複交点の除去
4. **可視化**: 円柱ジオメトリで直感的に折り線を表示

### 3. 折り紙の折り動作

**目的**: 計算された折り線に基づいて折り紙を実際に折る

**実装状況**: ✅ 完了（1 回折りまで）

**実装方針**:

1. **板の分割**: 折り線で折り紙を 2 つの部分に分割 ✅
2. **回転の計算**: 折り線を軸として一方の部分を回転 ✅
3. **視覚的表現**: 折られた状態を Three.js で再現 ✅

#### 3-1. 板の分割ロジック ✅

**データモデル**: `types.ts` に定義

- `Board = THREE.Vector3[]`（順序付き頂点列の多角形。初期状態は正方形だが折るたびに任意の多角形になる）
- `FoldLine = { start, end }`

**実装済みユーティリティ**（すべて純関数・テスト付き）:

1. **`isPointLeftOfLine(point, lineStart, lineEnd)`**

   - 場所: `utils/isPointLeftOfLine/index.ts`
   - XY 平面上で点が有向直線の左/右/線上のどこにあるかを外積の z 成分で判定
   - 線上（epsilon 1e-6 以内）の場合は `null` を返す 3 値判定

2. **`separateBoard(board, foldLine)`**

   - 場所: `utils/separateBoard/index.ts`
   - 頂点列を一周しながら、各頂点を折り線のどちら側にあるかで片方の板へ振り分け、
     線上の頂点は両方へ追加。折り線を跨ぐ辺は交点を計算して両方へ追加
   - 戻り値は分割された 2 つの板のタプル `[Board, Board]`（順序に意味はない。
     左右どちら側かの分類は関数内部の実装詳細に留める）
   - 分割できない場合（折り線が板を横切らない、辺と一致、退化した板ができる）は `null`
   - **旧実装（`OrigamiPost/logics/separateBoard`）との違い**:
     - 旧: 頂点分類 → 交点追加 → atan2 ソート（凸多角形前提、epsilon 判定に潜在バグ）
     - 新: 元の頂点の並び順のまま振り分けるためソート不要。凹多角形にも対応

3. **`selectMovingBoard(boards, originalPoint, foldLine)`**
   - 場所: `utils/selectMovingBoard/index.ts`
   - 分割された 2 つの板のうち、ドラッグした頂点（originalPoint）と
     折り線に対して同じ側にある板を「動く板」として返す
   - originalPoint が折り線上にある場合は `null`（防御的処理）

#### 3-2. 板の分割描画（drop 時のシーン差し替え） ✅

**実装済みユーティリティ**:

1. **`createSquareBoard(size)`**

   - 場所: `utils/createSquareBoard/index.ts`
   - 初期状態の正方形の板（`Board`）を生成。頂点データの重複定義を解消

2. **`createBoardMesh(board, color, options)`**
   - 場所: `utils/createBoardMesh/index.ts`
   - `THREE.Shape` → `ShapeGeometry` で任意多角形の板を描画（earcut 内蔵で凹多角形対応）
   - マテリアルは折り紙の板と同じ半透明 Lambert・両面描画 + 黒枠線
   - `enablePolygonOffset` オプション: 折り重なった際の z-fighting を防ぐ（動く板に指定）

**drop 時のシーン差し替え（useDropHandler）**:

折り線確定後、以下の流れで折り紙を分割された板に差し替える:

1. `separateBoard` + `selectMovingBoard` で分割（**失敗時は何もせず idle 継続**。
   折り線・分割板は描画されず、再ドラッグを待つ）
2. 折り線を可視化し、`FoldLineState` を保存
3. 既存の折り紙（`origami`）とスナップポイント（`snapPoint_*`）を remove + dispose
4. 固定される板を `board_static` としてシーンに追加
5. 動く板を `board_moving` として**ピボット Group**（`board_moving_pivot`）に入れて追加
6. `foldPhase` を `folding` に遷移（以後ドラッグ&ドロップ・初期描画は無効）

**ピボット Group 構造**:

```
scene
├── board_static          (固定される板: Mesh + 枠線のGroup)
├── board_moving_pivot    (Group: position = 折り線の始点)
│   └── board_moving      (動く板: position = -折り線の始点)
└── foldLine              (折り線の可視化シリンダー)
```

- Group の position を折り線上の点に置き、板メッシュを逆オフセットすることで
  ワールド座標を維持したまま「Group の回転 ＝ 折り線周りの回転」になる
- 3-3 ではこの Group を `setRotationFromAxisAngle(折り線方向, angle)` で回転させる

#### 3-3. 180 度折りアニメーション ✅

**実装済みユーティリティ・フック**:

1. **`determineFoldRotation(foldLine, movingBoard)`**

   - 場所: `utils/determineFoldRotation/index.ts`
   - 正の回転角で動く板が**+Z 側（カメラ側）へ持ち上がる向き**の
     正規化済み軸ベクトルを返す純関数
   - 折り線から最も離れた頂点の微小回転方向 `(axis × r).z` の符号で判定

2. **`rotateBoard(board, axisPoint, axisDirection, angle)`**

   - 場所: `utils/rotateBoard/index.ts`
   - `applyAxisAngle` で全頂点を任意軸周りに回転した新しい板を返す純関数
   - アニメ完了時の頂点座標の bake（板データへの反映）に使用。
     多重折りではこの確定済み座標を次の折りの入力にする

3. **`useFoldAnimation`**
   - 場所: `hooks/useFoldAnimation/index.tsx`
   - `foldPhase` が `folding` になったらアニメーション開始
   - rAF tween（800ms、easeInOutCubic）でピボット Group を
     `setRotationFromAxisAngle(axis, 0→π)` で回転
     （描画は useInitScene のアニメーションループが毎フレーム行う）
   - アニメーション中は OrbitControls を無効化
   - 完了時: 折り線シリンダーを削除、板を +Z 0.05 オフセット
     （z-fighting 回避）、頂点座標を bake、`folded` へ遷移
   - cleanup で `cancelAnimationFrame`

**アニメーション方式の比較と採用理由**:

| 方式                                       | 説明                                             | 評価                                                     |
| ------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- |
| **ピボット Group 回転（採用）**            | Group の変換行列のみ更新。ジオメトリは不変       | GPU の行列計算のみで軽量。コードもシンプル               |
| 頂点再計算（旧実装の rotateBoards 方式）   | 毎フレーム全頂点を回転し BufferGeometry を再構築 | CPU コスト・GC 負荷が高い。旧実装はアニメなしの一発適用 |

**FoldPhase 遷移図**（当時。4-2 で `folded` を廃止し、完了後に idle へ戻る形に変更）:

```
idle ──(drop: 折り線確定・板分割)──> folding ──(アニメ完了)──> folded
 │                                                              │
 └── ドラッグ&ドロップ可能                                       └── 操作不可（ステップ3時点の終端）
```

### 4. 複数回折り・Undo/Redo・裏返し（ステップ 4）

**目的**: 折り完了後にさらに折れるようにし、Undo/Redo と裏返し（視点 180 度回転）を提供する

#### 4-1. データモデルと折り計算ロジック ✅

**データモデル**（`types.ts`）:

- `LayeredBoard = { polygon: Board; layer: number }`
  - polygon は XY 平面上（z=0）で保持し、重なり順は layer で表現する
  - 描画時に `z = layer * オフセット` で立体的に重ねる（layer が大きいほど表側）
- `FoldStep = { foldLine, dragVertex, foldCount, viewFront }`
  - 1 回の折り操作を表す履歴の 1 要素。初期状態の正方形に FoldStep を
    順に適用（**リプレイ**）することで現在の板形状を再現できる
  - この履歴が Undo/Redo（4-4）と投稿データ化（次シリーズ以降）の基礎になる

**折りのセマンティクス**（ユーザー決定事項）:

ドラッグした頂点（dragVertex）を起点に折る対象を決める:

1. 頂点が 1 枚の板にのみ属する場合 → その 1 枚だけを折る（即時フロー）
2. 折りで頂点が重なり、複数の板が同じ位置に頂点を持つ場合 →
   スナップポイントを 1 つに集約し、ドロップ後に折る枚数を選択（4-3 の UI）

**実装済みユーティリティ**（すべて純関数・テスト付き）:

1. **`collectSnapPoints(boards)`**

   - 場所: `utils/collectSnapPoints/index.ts`
   - 全板の頂点を XY 平面上の距離 0.1 以内でグループ化し、
     集約済みスナップポイント（位置 + 頂点を共有する板の数）を返す
   - 板の数が 2 以上のポイントは折る枚数の選択が必要になる

2. **`calculateFoldLineSpan(midpoint, direction, boards)`**

   - 場所: `utils/calculateFoldLineSpan/index.ts`
   - 無限直線としての折り線が**対象の板群**を横切る区間を計算
     （正方形前提だった `calculateFoldLineIntersections` の一般化。
     4-2 で使用箇所を置き換えた後、旧関数は削除する）

3. **`applyFoldStep(boards, step)`**
   - 場所: `utils/applyFoldStep/index.ts`
   - 現在の板群に 1 回の折り操作を適用する純関数。リプレイの中核
   - 手順:
     1. dragVertex と同一位置に頂点を持つ板を視点側（表なら layer 降順）に
        並べ、先頭 foldCount 枚を対象にする
     2. 対象板それぞれを `separateBoard` で分割（1 枚でも分割不可なら
        折り全体を不成立として null）。**対象外の板は折り線が幾何的に
        横切っていても動かさない**（対象の紙だけをつまんで折るため）
     3. 各対象板の dragVertex と同じ側の片が動く片（`selectMovingBoard`）
     4. 動く片は `rotateBoard` で折り線周りに 180 度回転
        （XY 平面上では鏡映。z は誤差蓄積を防ぐため 0 に揃える）
     5. 動く片のレイヤーは、表折りなら現在の最大レイヤーの上に
        **元の重なり順を逆転**して積む（裏折りなら最小レイヤーの下）
   - 戻り値はリプレイ用の確定状態 `boards` に加え、アニメーション用に
     回転前の `movingBoards`・動かない `staticBoards` を返す

**既知の制限**:

- 埋もれた板を他の板を貫通して折れてしまう判定はしない
- 折り角は 180 度固定

#### 4-2. 複数回折り ✅

**状態管理の再設計**（`index.tsx`）:

- **折り手順の履歴（`history: FoldStep[]`）が唯一の状態源**。現在の板群は
  `replayFoldSteps(initialBoard, history)` のリプレイで `useMemo` 導出する
  - 常に初期状態から再計算するため、Undo/Redo（4-4）でも誤差が蓄積しない
- `FoldPhase` は `"idle" | "folding"` の 2 値になり、`folded` 終端を廃止。
  アニメーション完了で idle へ戻り、繰り返し折れる
- ドロップ時は `PendingFold`（適用する FoldStep + 回転前の動く片）を保存し、
  アニメーション完了時に `completeFold` が履歴へ確定する

**FoldPhase 遷移図**（4-3 で selecting を追加）:

```
        ┌──(drop: 折れる枚数が1通り)──────────────────────┐
        │                                                 v
idle ───┤                                              folding ──(アニメ完了: 履歴へ確定)──> idle
 ^      │                                                 ^
 │      └──(drop: 折れる枚数が複数通り)──> selecting ──(折る: 確定)──┘
 │                                            │
 └────────────(キャンセル)────────────────────┘
```

**描画パイプラインの統一**（`useDragDrop/useRenderBoards`）:

- 旧 `useInitialRender`（正方形専用）+ `renderOrigamiBoard` を廃止し、
  idle 時は常に `currentBoards` を `createBoardMesh` で描画する
  （初期状態も「正方形の板 1 枚」として同じパイプラインを通る）
- 各板は `z = layer * BOARD_LAYER_OFFSET`（`constants.ts`、0.05）で浮かせる
- スナップポイントは `collectSnapPoints` の集約結果を描画

**シーン構造**:

```
scene
├── board_0..n            (idle時: 現在の板群)
├── snapPoint_0..n        (idle時: 集約済みスナップポイント)
│
├── board_static_0..n     (folding時: 動かない板 = 固定片 + 折り対象外の板)
├── board_moving_pivot    (folding時: Group, position = 折り線始点)
│   └── board_moving_0..n (動く片: position = -折り線始点 + layerオフセット)
└── foldLine              (folding時: 折り線シリンダー)
```

- シーン上の板・スナップポイントの一括削除は `removeBoardObjects`
  （`board*` / `snapPoint_*` を remove + dispose）に共通化

#### 4-3. 折る枚数の選択 UI ✅

**フロー**（ドロップ時、`useDropHandler`）:

1. 1〜候補数の各枚数について折りが成立するか事前検証（`validCounts`）。
   1 つも成立しなければ何もしない（idle 継続）
2. 折れる枚数が 1 通りに定まる場合（候補が 1 枚、または破れ判定などで
   1 通りしか成立しない場合）→ 選択させずその枚数で即 folding へ
3. 折れる枚数が複数通りある場合のみ、折り線を全候補を覆うスパンで
   プレビュー表示し、`FoldProposal` を保存して selecting フェーズへ
4. selecting 中はドラッグ&ドロップ無効。`FoldCountSelector` カードで枚数を
   選択（成立しない枚数は無効化、デフォルトは選択できる最小の枚数）
   - 「折る」→ `confirmFold(count)` が折りを確定して folding へ
   - 「キャンセル」→ `cancelFold()` が折り線を消して idle へ

**実装**:

- `FoldCountSelector/`: キャンバス下部中央のフローティングカード
  （Storybook: `Components/v2/OrigamiPost/FoldCountSelector`）
- `useDragDrop/commenceFold.ts`: 折りの確定処理（スパン計算 → applyFoldStep →
  折り線可視化 → シーン差し替え）を共通化。ドロップ（候補 1 枚）と
  `confirmFold`（枚数選択後）の両方から使う
- `useDragDrop` は `{ confirmFold, cancelFold }` を返し、`index.tsx` が
  `FoldCountSelector` へ渡す

#### 4-4. Undo / Redo + ツールバー ✅

**履歴データ構造**（`utils/foldHistory/index.ts`、純関数・テスト付き）:

- `FoldHistory = { steps: FoldStep[]; index: number }`
  - `steps` は折り操作の全履歴、`index` は適用済みのステップ数
  - Undo は `index` を戻すだけで `steps` は保持（Redo で再適用できる）
  - Undo で戻った位置から新しく折ると、先の履歴（Redo 対象）は破棄
- 板の形状は `appliedFoldSteps(history)`（先頭 index 件）のリプレイで導出。
  常に初期状態から再計算するため Undo/Redo を繰り返しても誤差が蓄積しない

**UI**（`Toolbar/`）:

- キャンバス左上にオーバーレイする縦ツールバー
  （Storybook: `Components/v2/OrigamiPost/Toolbar`）
- 既存の `src/components/ui/IconButton` + react-icons（hi2）を再利用
  （IconButton にはアクセシビリティ用の `ariaLabel` プロップを追加）
- idle 以外のフェーズ・履歴の端では無効化

#### 4-5. 裏返し（視点 180 度回転） ✅

**視点回転**（`hooks/useFlipView`）:

- ツールバーの「裏返す」ボタンでカメラを Y 軸周りに 180 度、
  rAF + easeInOutCubic（600ms）で回転させる（折り紙のデータは変更しない）
- アニメーション中は OrbitControls と各操作ボタンを無効化
- 裏面が暗くならないよう、useInitScene に背面側からの弱い平行光源を追加

**裏側から見た折り**:

- どちら側から見て折っているかは、**ドロップ時のカメラ位置（z の符号）**で
  判定し、`FoldStep.viewFront` に記録する（リプレイはカメラに依存せず決定的）
- `determineFoldRotation` に `liftDirection` 引数（±Z）を追加。
  裏から見た折りでは動く片が -Z 側（視点側）を通って折り返される
- `applyFoldStep` は viewFront=false のとき候補板をカメラに近い順
  （layer 昇順）で数え、動く片は最小レイヤーの下へ積む（4-1 で実装済み）
- 折る枚数の選択（4-3）も同じ viewFront で候補順・検証を行う

#### 4-6. 破れ防止（展開図連結性） ✅

**問題**: 板を独立したポリゴンとして扱っていたため、折り目でつながっているはずの
板を 1 枚だけ折れてしまい、「紙を破って折る」動作が可能だった。

**データモデル**（`types.ts`）:

- `BoardPiece = { polygon: Board; sourcePolygon: Board }`、
  `LayeredBoard extends BoardPiece`
- `sourcePolygon` は**展開図空間**（折る前の正方形の座標系）でのポリゴン。
  `polygon` と同じ長さで、インデックス i の頂点同士が紙上の同一点に対応する
- `sourcePolygon` は折りで回転・鏡映されず、分割時に細分されるだけ
  （座標は常に初期正方形上 → 誤差が蓄積しない）
- 履歴（`FoldStep[]`）が唯一の状態源という設計は不変。`sourcePolygon` は
  リプレイ中に導出される状態で、履歴・投稿データには影響しない

**連結性の定義**: 紙は展開図上では連続体なので、2 つの板が物理的に
つながっている（折り目がある）⟺ **展開図上で正の長さの境界線分を共有する**。

**破れ判定ルール**（`applyFoldStep` 内、不成立なら null）:

> 「動く片」と「動かない片」が展開図上で境界線分を共有する場合、
> その線分は折り畳み空間で**今回の折り線上**に載っていなければならない
> （載っていればヒンジとして回転するだけなので破れない）

- 動く片同士は同一の回転を受けるため接続が保たれる → チェック不要
- 対象板の「動く片 vs 自分の固定片」の共有辺は今回のカット辺（折り線上）
  なので一般則で自動的にパスする
- 既存の事前検証フロー（`collectValidCounts`）に乗る。破れる枚数は
  折れる枚数の選択肢から除外され、1 通りに定まる場合は選択させず即折る
  （4-3 のフロー参照）

**実装**:

- `separateBoard`: `polygon` と `sourcePolygon` を同じインデックス・
  同じ補間比率でロックステップ分割する形にシグネチャ変更
  （側の分類・退化判定は従来どおり折り畳み空間で行う）
- `selectMovingBoard`: `BoardPiece` のペアを受け取る形に一般化
- `findSharedSourceSegments`（新規）: 展開図ポリゴン同士が共有する
  境界線分の検出（共線かつ正の長さの重なり。点接触は共有としない）と、
  展開図境界上の点を折り畳み空間へ写像する
  `mapSourceBoundaryPointToFolded` を提供

**Z 座標方式を採らなかった理由**（検討時の対案）:

- 「同じ位置・同じ高さ = つながっている」は成り立たない。観音折りでは
  左右のフラップの縁が同じ位置・同じ高さで接するがつながっていない（偽陽性）
- 破れは頂点ではなく**辺単位**で起こる（折り目上でない頂点をドラッグしても、
  折り線が折り目を横切れば破れる）ため、頂点の Z 一致では検出できない
- ポリゴンが非平面になり、描画（ShapeGeometry）・分割（XY 前提）・
  z=0 に揃える誤差対策など広範囲の設計と衝突する

**既知の制限**（変更なし）:

- 埋もれた板を他の板を貫通して折れてしまう判定はしない
  （展開図連結性のデータはこの判定の将来の基礎になる）
- 折り角は 180 度固定

#### 4-7. ドラッグ中の頂点スナップ（吸着） ✅

**問題**: 頂点から頂点へ動かして折る操作が大半だが、マウスの解像度の限界で
ドロップ位置が目標の頂点から微妙にずれる（0.1〜0.2 ユニット程度）。ずれが
`SNAP_MERGE_TOLERANCE`（0.1）を超えると、折りで重なるはずの頂点が別々の
スナップポイントとして集約され、次の折りで枚数の候補が正しく数えられなかった。

**解決**: ドラッグ中の点が近くのスナップポイント（頂点）に接近したら、
その座標へ吸着させる（`snapToNearestSnapPoint`）。

- 吸着半径は `SNAP_ATTRACTION_RADIUS = 8`（ワールド空間、板の一辺 100 に対して）
- XY 平面上のユークリッド距離で判定し、半径内で最も近いものへ吸着する
- 適用箇所は `useDragHandler` の mousemove のみ。ドロップ処理は
  draggedPoint メッシュの位置を読むため、ドロップ座標も自動的に吸着済みになる
- 吸着した座標で折ると鏡映後の頂点が既存頂点と正確に重なり、
  `collectSnapPoints` の集約（`SNAP_MERGE_TOLERANCE`）が意図どおり機能する
- ドラッグ開始点へ吸着させて戻すと折り線が計算されず（同一点 → null）、
  そのままキャンセル操作になる

#### 4-8. 開いて畳む（スクワッシュフォールド） ✅

**目的**: 鶴の正方基本形を作る操作のように、折り目でつながった 2 枚の
フラップを開いて平らに畳む操作（閲覧機能では `ConvolutionStep` として
再現済み）を投稿側でも作れるようにする。対応範囲は**基本ケース限定**
（1 つのポケットを対称に開いて畳む）。

**用語**（三角形に 2 回折った後、頂点 V を反対側へドラッグする例）:

- **フラップ**: dragVertex V を持つ視点側 2 枚（手前 = X、奥 = Y）
- **スパイン**: X と Y が共有する折り目 V–A。A はその反対側の端点
- **ヒンジ h**: Y と固定側の板が共有する折り目（A を通る直線）
- **折り線 L**: 通常の折りと同じ、ドラッグの垂直二等分線

**成立条件**（`applySquashFoldStep`、不成立なら null）:

1. 候補（V を持つ板）が 2 枚以上
2. X と Y の共有折り目がちょうど 1 本で、一端が V、他端 A が折り線 L 上
   （A が L 上にないと平らに畳めない）。V 自体は L 上にない
3. Y と固定側の共有折り目がすべて A を通る 1 本の直線 h 上にある
   （h ≠ L。複数ポケットや非対称な開きはここで弾かれる = 基本ケース限定）
4. X・Y を L で分割した 4 片に下記の変換を適用した**最終状態**で、
   全ての片のペアの共有折り目が折り畳み空間でも一致する
   （4-6 の破れ判定を「片ごとに異なる変換」へ一般化した数値検証。
   スパイン・カット辺・ヒンジ・想定外の接続をまとめて検証する）

**4 片の変換とレイヤー**（表折り、M = 現在の最大レイヤー）:

| 片                        | 変換                              | 最終レイヤー |
| ------------------------- | --------------------------------- | ------------ |
| X の固定片                | 不動                              | X.layer      |
| X の V 側 (mirrorFoldLine) | L で鏡映                          | M+3          |
| Y の V 側 (openRotate)    | L で鏡映 → h で鏡映（開く部分）   | M+2          |
| Y の反対側 (mirrorHinge)  | h で鏡映（ヒンジ周り 180 度回転） | M+1          |

裏折りは min−1..−3 に対称。接続整合性は「L(スパイン) ⊂ h」かつ
「L 上の点は L の鏡映で不動」により保たれる（条件 4 で数値検証）。

**データモデル**: 履歴要素を判別可能ユニオン化
（`OrigamiStep = FoldStep | SquashFoldStep`、`kind: "fold" | "squash"`）。
`SquashFoldStep` はジェスチャの最小情報（foldLine・dragVertex・viewFront）
のみを持ち、幾何はリプレイ時に `applySquashFoldStep` が再導出する。
Undo/Redo は履歴の仕組みそのままで動く。

**発動 UX**: 典型的な開いて畳むジェスチャでは**通常の折り（2 枚・4 枚）も
同時に成立する**（スパインは動く片同士の共有なので破れない）ことが
検証で判明したため、「通常の折りが全滅した時だけ発動」は採らず
枚数選択に統合した:

- 通常の折りが全滅かつ開いて畳むのみ成立 → 選択させず即実行
- 両方成立 → `FoldCountSelector` に「開いて畳む」の選択肢を追加
- 従来 1 通りで即折りだったドロップも、開いて畳むが成立する場合は
  選択カードを出すようになる（挙動変更）

**アニメーション**: 動く 3 片は別々の軸で回転するため単一ピボット
Group では表現できない。閲覧機能の `convolution` と同じ
**頂点ごと軸方式**を採用（`computeSquashAnimationPositions`）: 全頂点が
同一角度 θ（0→π）で自分の軸周りに回転する。頂点の分類は
mirrorFoldLine = L 周り / mirrorHinge = h 周り / openRotate = ヒンジ上→不動、
L 上→h 周り、スパイン上→L 周り、その他→L→h の合成回転。片は途中経過では
厳密な剛体ではないが、隣り合う片と共有する辺の頂点が同じ動きに分類される
ため見た目上破れない。メッシュは `createMorphBoardMesh`（三角形分割は
作成時に 1 回、毎フレーム position 属性のみ書き換え）。ヒンジ線は
`visualizeFoldLine` の name/color オプションで折り線と別色表示する。

**既知の制限・将来**:

- フラップは視点側 2 枚固定。3 枚以上を同時に開く深いスカッシュ
  （鶴の基本形以降の操作）は条件 3・4 で弾かれ発動しない
- `SquashFoldStepResult.movingPieces`（片ごとの回転前/確定後座標）は
  閲覧機能の `ConvolutionStep`（nodes / moveNodesIdx / rotateAxes）への
  変換にそのまま使える構造にしてある（投稿データ化は未実装）

### 5. 花弁折り・投稿データ化・v2 閲覧（次シリーズ・方針合意済み）

**目的**: 鶴の正方基本形の次の**花弁折り**を投稿側で折れるようにし、
投稿データ化（保存）と v2 閲覧の再生までを通す。

**背景（調査で確認した事実）**:

- 旧閲覧の `ConvolutionStep` は答えの幾何（nodes / boards / moveNodesIdx /
  rotateAxes）を丸ごと受け取り θ 回転で再生するだけ。そのデータは
  `prisma/mock/畳んで折る.json` の手書きモックのみで、投稿 UI から
  作られたことはない（「閲覧側が汎用」の実態はデータが答えを持っているから）
- 現状の `applySquashFoldStep` はスパイン 1 本＋ヒンジ 1 本の基本ケース
  専用で、花弁折り（複数ヒンジ・複数片が同時に動く）は成立条件で弾かれる
- 保存 API（`POST /api/data`）は既存。`Model.procedure` は Prisma の
  JSON カラムで形式は自由。旧閲覧との互換は考えない（ユーザー合意）

**方針（合意済み）**: 内部はジェスチャ履歴＋ソルバのまま、
**保存時に「答え形式」へエクスポート**する。花弁折りはソルバの
新ステップ種別として追加する。

```
ドラッグ入力 ──> ジェスチャ履歴 OrigamiStep[]（唯一の状態源）
                    │ リプレイ（ソルバ: fold / squash / petal★新規）
                    v
               片・軸・レイヤーの幾何 ──保存時──> 答え形式＋履歴を Model.procedure へ
                                                      │
                                             閲覧側: θ回転で再生するだけ（ソルバ不要）
```

- **保存が楽**: ソルバがリプレイで全幾何を計算済み。保存はその結果を
  書き出すエクスポータ 1 本
- **閲覧が楽**: 答えデータを頂点ごと軸方式で回すだけ（現行 convolution
  再生と同型）。閲覧はソルバに依存しない
- **保存形式は「答え形式＋ジェスチャ履歴」の両方**（ユーザー決定）。
  履歴はほぼゼロコストで、将来の再編集・ソルバ改良時の再エクスポートを
  可能にする
- 「汎用ステップを投稿 UI の入力に持ち込む」案は不採用。汎用（答え）
  形式は保存フォーマットとしてだけ使い、入力 UX はドラッグ＋ソルバのまま

#### 5-1. 花弁折りソルバ `applyPetalFoldStep` ✅

**用語**（正方基本形の先端 V を反対側へドラッグする例）:

- **フラップ**: dragVertex V を持つ視点側 2 枚（前面の左右半分。
  スパイン V–C を共有する）
- **相方**: 各フラップと折り目 C–corner でつながる裏の板
  （正方基本形ではフラップの直下の板）
- **かぶせ折り線 k**: V から折り線と折り目の交点 P への線
- **折り線 h**: スパインに垂直な線（下記のとおり正準化される）

**折り線の正準化**: 花弁折りが平らに畳めるのは、かぶせ折りで
corner がスパイン上へ写る位置だけなので、折り線はジェスチャからではなく
**構造から一意に導出**する: スパイン上で V から距離 |V–corner| の点 A を
通る垂線。ドラッグの折り線は V の畳み先（スナップポイントに吸着できない
無理数座標）に依存するため、そのまま使うとリプレイが不安定になる。
`buildPetalFoldStep` はジェスチャの折り線が A の近く
（`acceptanceRadius`）を通ることだけを確認し、正準化した折り線を
ステップに保存する。`applyPetalFoldStep` は保存された折り線が
正準位置と一致することを検証してから適用する（防御的処理）

**成立条件**（`detectPetalStructure`、不成立なら null）:

1. 候補（V を持つ板）が 4 枚以上で、視点側 2 枚（フラップ）が V を
   端点とするスパインをちょうど 1 本共有する
2. 各フラップは残りの候補のうちちょうど 1 枚（相方）とちょうど 1 本の
   折り目を共有し、その折り目はスパイン端点 C と corner を結ぶ
3. 左右の腕の長さ |V–corner| が等しい（対称なかぶせ折りのみ = 基本ケース）
4. A がスパインの内部にあり（腕がスパインより長いと平らに畳めない）、
   折り線が左右の折り目の内部と交わる
5. 分割後の**最終状態**で全ての片のペアの共有折り目が折り畳み空間でも
   一致する（`isConnectivityPreserved`。かぶせ折りの成立条件
   「corner の鏡映が h 上に載る」もここで数値検証される）

**6 片の変換とレイヤー**（表折り、M = 現在の最大レイヤー。
フラップは k と h で 3 片に、相方は k で 2 片に分割される）:

| 片                       | 変換                     | 最終レイヤー |
| ------------------------ | ------------------------ | ------------ |
| フラップの固定片（C側）  | 不動                     | 元のまま     |
| 相方の固定片             | 不動                     | 元のまま     |
| 相方の耳片（corner側）   | k で鏡映（内側へ畳む）   | M+1 / M+2    |
| フラップのサイド片       | k で鏡映 → h で鏡映      | M+3 / M+4    |
| フラップの中央片（V側）  | h で鏡映（先端持ち上げ） | M+5 / M+6    |

裏折りは min−1..−6 に対称。左右では奥側フラップの片が内側になる。
確定後は中央片とサイド片が完全に重なり（鶴の基本形の前面）、耳は
相方の固定片の上に畳み込まれる（実物の基本形で内側に挟まる小さな三角）

**データモデル・共有化**:

- 履歴要素に `PetalFoldStep`（foldLine・dragVertex・viewFront）を追加
  （`OrigamiStep` の判別可能ユニオンを拡張、`replayFoldSteps` に分岐追加）
- `PetalPiece` は回転前/確定後の座標に加えて **`axes: FoldLine[]`**
  （同一角度 θ で順に適用する回転軸、1〜2 本）を持つ。これは投稿データ化
  （5-3）の v2 答え形式「頂点ごとの軸の列」にそのまま対応する
- squash と共通のヘルパーを移設: `mirrorBoardAcrossLine`（→ `rotateBoard`）、
  `isConnectivityPreserved`（→ `findSharedSourceSegments`）

**既知の制限**:

- フラップ視点側 2 枚 + 相方 2 枚の対称な基本ケース限定
  （鶴の正方基本形 → 鶴の基本形の花弁折りが対象）
- 相方が耳ごと動く深い花弁折りや、非対称なかぶせ折りは成立条件で弾かれる

#### 5-2. 発動 UX・アニメーション ✅

**発動 UX**: squash と同様に枚数選択へ統合。ドロップ時の分岐は
「成立する操作数」ベースに整理した（`useDropHandler`）:

- 成立する操作（折れる枚数・開いて畳む・花弁折り）が 1 通り →
  選択させず即実行
- 複数通り → `FoldCountSelector` で選択（「花弁折り」の選択肢を追加。
  選べる操作は `FoldChoice = number | "squash" | "petal"`）
- `commencePetalFold` は `commenceSquashFold` に倣い、折り線（赤）と
  左右のかぶせ折り線（オレンジ、`foldLine_kite_0/1`）を可視化して
  シーンを「動かない板 + 動く片のモーフ板（`board_petal_moving_*`）」に
  差し替える
- 花弁折りの折り線はドラッグから直接は決まらないため、
  `buildPetalFoldStep` はジェスチャの折り線が正準位置 A から
  `SNAP_ATTRACTION_RADIUS`（8）以内を通る場合に発動候補とする
  （V の畳み先はスナップポイントに吸着できないため、この半径で
  「花弁折りの意図」を拾う）

**アニメーション**: squash と同じ頂点ごと軸方式
（`computePetalAnimationPositions`）。全頂点が同一角度 θ（0→π）で
自分の軸周りに回転する。頂点の分類は
中央片 = 折り線周り（折り線上は不動）/ 耳片 = かぶせ折り線周り
（線上は不動）/ サイド片 = 折り線上→不動、かぶせ折り線上→折り線周り
（中央片と接着）、畳み込み折り目上→かぶせ折り線周り（耳片と接着）、
その他→かぶせ折り線→折り線の合成回転。回転軸の向きは
`determineFoldRotation` で中央片・左右の耳片から決める
（`useFoldAnimation` の petal 分岐）

#### 5-3. 投稿データ化（エクスポータ） ✅

**v2 答え形式**（`src/types/model-v2.ts` の `ProcedureV2`）:

- 旧 convolution の「動く頂点ごとに 1 軸」を、**動く板の頂点ごとに
  軸の列（0〜2 本）を同一角度 θ で順に適用**する形へ一般化した
  （squash の openRotate・petal のサイド片は合成回転のため 1 軸では
  表現できない。0 本 = 不動）
- 1 ステップ = `{ kind, fixBoards, moveBoards, foldLines }`。
  moveBoard は `{ polygon, layer, vertexAxes }` を持ち、閲覧側はソルバなしで
  θ 回転の再生だけで折り手順を表示できる（レイヤーは Z オフセット用）
- `ProcedureV2 = { version: 2, size, steps, finalBoards, history }`。
  ジェスチャ履歴（`HistoryStepV2`、`THREE.Vector3` → `[x, y, z]`）も
  一緒に保存し、将来の再編集・ソルバ改良時の再エクスポートを可能にする

**エクスポータ**（`utils/exportProcedureV2`、純関数・テスト付き）:

- 履歴をリプレイしながら各ステップの答えデータを書き出す。
  適用できないステップがあれば null（履歴は検証済みのため通常起こらない）
- **回転軸の分類はアニメーションと同じ関数を使う**ため、投稿時に見た
  動きと保存データの再生が必ず一致する。このために分類を共有化した:
  - `utils/vertexAxes`: `VertexAxis`（軸の点＋向き付き方向）と
    `applyVertexAxes`（軸の列を θ で順に適用）
  - `computeSquashAnimationPositions` を `deriveSquashRotationAxes`
    （軸の導出）+ `collectSquashVertexAxes`（頂点ごとの分類）+
    再生（applyVertexAxes）に分離。petal も同様
    （`derivePetalRotationAxes` / `collectPetalVertexAxes`）。
    `useFoldAnimation` も同じ導出関数を使う形にリファクタ
- テストの核: 鶴の基本形までの 5 ステップについて、**各ステップを
  θ=π まで再生した結果がリプレイの次状態と一致**することを検証

#### 5-5. 投稿フロー（保存 UI・API 接続） 🔄

- 投稿ボタン・モデル名の入力・サムネイル取得などの UI と、
  `exportProcedureV2` の結果を既存 `POST /api/data` へ送る接続（未実装）

#### 5-6. 既存の折り目に沿って畳む折り（板を分割しない折り） ✅

**問題**: 通常の折りは「折り線が対象の板を横切って分割する」前提で、
分割できない板があると即不成立にしていた。このため鶴の基本形（両面
花弁折り後の菱形）を**中心の折り目に沿って半分に畳む**操作や、フラップの
めくり、花弁を戻す操作など、**既存の折り目に沿って板を丸ごと回す折り**が
すべて「折れない判定」になっていた（折り線が板の辺や頂点に沿うだけで
内部を横切らないため）。

**解決**（`applyFoldStep` の `splitTargetBoard`）: 対象板ごとに分岐する

- 折り線が板を**跨ぐ** → 従来通り `separateBoard` で分割
  （新しい折り目を作る折り）
- 板全体が**ドラッグ頂点側**にある → 分割せず板を丸ごと動く片にする
  （固定片は null）。候補板はドラッグ頂点（折り線上にない点）を持つため、
  反対側に全体があることはない

**ガード**: どの板も分割されない折りは、動く片が動かない板と折り目で
つながっている場合だけ成立する（つながっていればその折り目が折り線上に
あることは既存の破れ判定 `isTearingFold` が検証する）。新しい折り目も
ヒンジもない操作はモデル全体が宙で回転するだけで折りではない
（例: 2枚重ねの三角を折り目ごと2枚とも回す = 裏返しと同じ → 不成立）。

**効果**（鶴の基本形からの操作が解禁）:

- 中心の折り目で半分に畳む: 10枚（全体）と5枚（前面側だけめくる）が成立
- かんざし先端 V' を折り線 h で畳み戻す方向の操作: 4枚・8枚が成立
- 破れ判定・レイヤー再割り当て・アニメーション（ピボット回転）は
  従来の仕組みがそのまま機能する

#### 5-4. v2 閲覧の再生 🔄

- `OrigamiDetailV2` を v2 答え形式（軸の列）対応に拡張。`foldProgress` に
  よる θ 再生の仕組みは実装済みなので、convolution 分岐の一般化が主な作業

## コンポーネント構成

### メインコンポーネント

- `OrigamiPost`: 折り紙折り動作のメインコンポーネント
- Three.js のシーン管理、イベント処理、状態管理を担当

### カスタムフック（実装状況）

**✅ 実装済み**:

- `useDragDrop`: ドラッグ&ドロップ操作の管理
  - `useInitialRender`: 折り紙とスナップポイントの初期描画
  - `useDragHandler`: ドラッグ開始・移動処理（`originalPoint`の保存含む）
  - `useDropHandler`: ドラッグ終了処理（折り線計算と可視化を統合）

**🔄 実装予定**:

- `useOrigamiFolding`: 折り紙の折り動作の管理

### ユーティリティ関数

**✅ 実装済み**:

- `calculateFoldLine`: 2 点から折り線情報を計算

  - 場所: `utils/calculateFoldLine/index.ts`
  - 入力: `p1`, `p2` (Vector3)
  - 出力: `{ midpoint, direction }` (FoldLineInfo | null)
  - 特徴: XY 平面対応、エッジケース処理

- `calculateFoldLineIntersections`: 折り線と折り紙境界の交点計算

  - 場所: `utils/calculateFoldLineIntersections/index.ts`
  - 入力: `midpoint`, `direction` (Vector3), `size` (number)
  - 出力: `{ start, end }` (FoldLineIntersections)
  - 特徴: XY 平面対応、重複除去、厳密な 2 点検証

- `visualizeFoldLine`: 折り線の可視化
  - 場所: `utils/visualizeFoldLine/index.ts`
  - 入力: `scene` (Scene), `start`, `end` (Vector3)
  - 特徴: 円柱ジオメトリ、自動削除、カスタマイズ可能

**🔄 実装予定**:

- `geometryUtils`: ジオメトリの分割、変形に関する関数

## 状態管理

**実装済みの状態** ✅（4-2 の再設計後）:

```typescript
// 折り操作のフェーズ
// - idle: 折り線の入力待ち（ドラッグ&ドロップ可能）
// - folding: 折りアニメーション中（ドラッグ&ドロップ不可）
type FoldPhase = "idle" | "folding";
const [foldPhase, setFoldPhase] = useState<FoldPhase>("idle");

// 折り手順の履歴（唯一の状態源）
const [history, setHistory] = useState<FoldStep[]>([]);

// アニメーション完了を待っている折り操作
const [pendingFold, setPendingFold] = useState<PendingFold | null>(null);

// ドラッグ開始時の元の点の位置
const [originalPoint, setOriginalPoint] = useState<THREE.Vector3 | null>(null);

// 現在の板群（履歴のリプレイで導出）
const currentBoards = useMemo(
  () => replayFoldSteps(initialBoard, history),
  [initialBoard, history]
);

// ドラッグ状態（useDragDrop内部）
const [draggedPoint, setDraggedPoint] = useState<Point | null>(null);
```

**リソース管理**:

- シーンからオブジェクトを`remove`する際は、`utils/disposeObject3D`で
  geometry/materialを必ず破棄してメモリリークを防ぐ

**将来の拡張予定** 🔄:

```typescript
// 折り紙の折り状態（折り動作実装時に追加）
interface FoldedState {
  isFolded: boolean;
  leftPart: THREE.Mesh | null;
  rightPart: THREE.Mesh | null;
  foldAngle: number;
}

const [foldedState, setFoldedState] = useState<FoldedState | null>(null);
```

## パフォーマンス考慮事項

1. **ジオメトリの最適化**: 不要な頂点の削除、LOD（Level of Detail）の実装
2. **イベント処理の最適化**: ドラッグ中のフレームレート維持
3. **メモリ管理**: 不要なジオメトリやマテリアルの適切な破棄
4. **アニメーション**: 折り動作のスムーズなアニメーション実装

## 今後の拡張予定

1. **複数回の折り**: 一度折った折り紙をさらに折る機能
2. **折り線の可視化**: 折り線の表示/非表示切り替え
3. **折り紙のリセット**: 初期状態への復帰機能
4. **折りパターンの保存**: 折り方の保存・読み込み機能
5. **物理演算**: より現実的な折り紙の物理特性の再現

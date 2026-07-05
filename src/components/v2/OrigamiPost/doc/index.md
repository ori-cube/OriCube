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
| 4-3      | 折る枚数の選択 UI                                         | 🔄 予定         |
| 4-4      | Undo / Redo + ツールバー                                  | 🔄 予定         |
| 4-5      | 裏返し（視点 180 度回転）                                 | 🔄 予定         |

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

**FoldPhase 遷移図**:

```
idle ──(drop: 折り成立・シーン差し替え)──> folding ──(アニメ完了: 履歴へ確定)──> idle
 │                                                                            │
 └── ドラッグ&ドロップ可能                                                     └── リプレイ結果を再描画
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

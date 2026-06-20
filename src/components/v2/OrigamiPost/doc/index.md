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
| 3        | 折り紙の折り動作                                          | 🔄 次のステップ |

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

**実装状況**: 🔄 実装中

**詳細な実装方針**: [折り動作実装方針.md](./折り動作実装方針.md) を参照

**実装の概要**:

1. **板の分割** (`dividePlane`)

   - 折り線で折り紙を 2 つの部分に分割
   - 折り線と折り紙の辺の交点を計算
   - 頂点を左右に分類し、反時計回りにソート

2. **メッシュ生成** (`createPlaneGeometry`, `createOrigamiMesh`)

   - 分割された頂点配列から BufferGeometry を生成
   - 表裏異なる色のマテリアルを適用
   - ワイヤーフレームで輪郭を強調

3. **回転アニメーション** (`useFoldAnimation`)

   - 折り線を軸として一方の部分を回転
   - スムーズなイージングアニメーション
   - Three.js の `Quaternion` と `applyAxisAngle` を活用

4. **折り動作の制御** (`useFoldingController`)

   - 板の分割 → メッシュ生成 → アニメーション開始の一連の流れを管理
   - 元の折り紙を非表示にし、分割された 2 つの部分を表示

5. **状態管理** (`useSceneManager`)
   - 折り紙の状態履歴を管理（将来の Undo/Redo のため）
   - 現在の折り紙の頂点情報を追跡

**実装の段階的アプローチ**:

- フェーズ 1: ユーティリティ関数の実装 ✅ **完了（34 テスト全て合格）**
- フェーズ 2: アニメーション機能の実装 🔄 **次のステップ**
- フェーズ 3: コントローラーの統合 📋
- フェーズ 4: UI/UX の改善 📋

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

**実装済みの状態** ✅:

```typescript
// ドラッグ状態
const [draggedPoint, setDraggedPoint] = useState<Point | null>(null);
const [isDragging, setIsDragging] = useState(false);

// ドラッグ開始時の元の点の位置
const [originalPoint, setOriginalPoint] = useState<THREE.Vector3 | null>(null);

// 折り線状態
interface FoldLineState {
  midpoint: THREE.Vector3; // 折り線が通る中点
  direction: THREE.Vector3; // 折り線の方向ベクトル
  start: THREE.Vector3; // 折り線の始点（折り紙境界との交点）
  end: THREE.Vector3; // 折り線の終点（折り紙境界との交点）
}

const [foldLineState, setFoldLineState] = useState<FoldLineState | null>(null);
```

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

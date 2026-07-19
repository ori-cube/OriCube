# 08 描画とアニメーション

## シーンの初期化と描画ループ — useInitScene

シーン・PerspectiveCamera・WebGLRenderer・OrbitControls（回転無効、damping あり）・レイキャスターを生成し、rAF の描画ループを回す。**毎フレームの `renderer.render` はここが一手に引き受ける**ため、アニメーション側（折り・裏返し）はオブジェクトの変換を更新するだけでよい。

ライトは環境光 + 表側からの平行光源に加え、背面側からの弱い平行光源を置く。裏返して見たときに極端に暗くならないようにするため。

## 板メッシュの生成 — createBoardMesh

`Board`（頂点列）から `THREE.Shape` → `ShapeGeometry` で任意多角形をメッシュ化する。ShapeGeometry は内部で earcut による三角形分割を行うため、折りで生じる凹多角形もそのまま描画できる。

- マテリアルは半透明（opacity 0.9）の Lambert・両面描画
- `EdgesGeometry` による黒い枠線を重ね、メッシュと枠線を1つの Group で返す
- `enablePolygonOffset` オプションで深度値をずらし、折り重なった板同士の z-fighting を防ぐ（folding 時の動く片に指定）

## idle 時の描画 — useRenderBoards

`currentBoards`（履歴のリプレイ結果）とスナップポイントを描画する。毎回 `removeBoardObjects` で全消ししてから描き直す宣言的な方式で、初期状態も「正方形の板1枚」として同じパイプラインを通る。

各板は `z = layer * BOARD_LAYER_OFFSET`（0.05）で浮かせ、重なり順を表現しつつ z-fighting を避ける。ドラッグ中の点と同位置のスナップポイントは描画から除外する。

## 折りアニメーション — ピボット Group 方式

### シーンの差し替え（commenceFold → replaceSceneForFolding）

折り確定時、idle 用の板群を削除し、`applyFoldStep` の結果からアニメーション用の構成を組む:

```
scene
├── board_static_0..n     動かない板（対象板の固定片 + 折り対象外の板）
├── board_moving_pivot    Group: position = 折り線の始点
│   └── board_moving_0..n 動く片: position = -折り線の始点 + layerオフセット
└── foldLine              折り線シリンダー
```

Group の position を折り線上の点に置き、中の板メッシュを逆オフセットする。ワールド座標は変わらないまま、**Group のローカル回転がそのまま折り線周りの回転になる**。

### 回転軸の決定 — determineFoldRotation

軸ベクトルの向きが逆だと板が反対側（紙にめり込む側）へ持ち上がるため、「正の回転角で動く片が視点側へ持ち上がる」向きの軸を選ぶ。折り線から最も離れた頂点を代表点に、微小回転での移動方向 `axis × r` が持ち上げ方向（表折りなら +Z、裏折りなら -Z）と同じ向きになるかの符号で判定する。これにより呼び出し側は常に 0→π の正の角度で回転させればよい。

### アニメーション本体 — useFoldAnimation

`foldPhase` が folding になったら開始。rAF で 800ms、easeInOutCubic のイージングで回転角を 0→π に進める。回転のさせ方は `PendingFold.kind` で分岐する:

- **通常の折り**: `pivotGroup.setRotationFromAxisAngle(axis, angle)` を更新。全ての動く片は折り線の同じ側にあるため、回転軸は全片の頂点をまとめて1回だけ決める
- **開いて畳む**: 動く3片が別々の軸で回転するため単一ピボット Group では表現できない。モーフ板（後述）の頂点座標を `computeSquashAnimationPositions` の結果で毎フレーム書き換える（[09](./09-squash-fold.md)）

共通の挙動:

- アニメーション中は OrbitControls を無効化
- 完了時: 折り線シリンダー（ヒンジ線を含む）を削除し、`completeFold` で履歴へ確定 → idle に戻ると `useRenderBoards` がリプレイ結果（適用関数で確定済みの座標）を描画する。アニメーション後の姿勢を座標に反映する処理は不要
- クリーンアップで `cancelAnimationFrame`（アンマウント・フェーズ変化時の停止）

### 方式の比較

| 方式 | 説明 | 評価 |
| --- | --- | --- |
| **ピボット Group 回転（通常の折りで採用）** | Group の変換行列のみ更新。ジオメトリは不変 | GPU の行列計算のみで軽量。コードもシンプル |
| **モーフ板の頂点書き換え（開いて畳むで採用）** | 三角形分割は作成時1回、毎フレーム position 属性のみ更新 | 片ごとに変換が異なる動きを表現できる。ShapeGeometry の再構築よりは軽い |
| 頂点再計算 + ジオメトリ再構築 | 毎フレーム BufferGeometry を作り直す | CPU コスト・GC 負荷が高い |

### モーフ板 — createMorphBoardMesh

開いて畳むの動く片は途中経過で厳密な平面でなくなるため、`ShapeGeometry` の作り直しではなく `BufferGeometry` の position 属性書き換えで動かす。三角形分割（`ShapeUtils.triangulateShape`）は頂点数が変わらない前提で作成時に一度だけ行い、面と枠線（LineLoop）は position 属性を共有するため1回の書き換えで両方動く。頂点が毎フレーム動くのでフラスタムカリングは無効化する。

## 裏返し — useFlipView

カメラを Y 軸周りに 180 度、rAF + easeInOutCubic（600ms）で回転させる。**折り紙のデータは一切変更しない**。裏側から見た状態での折りはドロップ時のカメラ位置から判定する（[05](./05-multi-board-folding.md)）。アニメーション中は OrbitControls とツールバーの各ボタンを無効化する。

## 折り線の可視化 — visualizeFoldLine

2点間を円柱ジオメトリで結ぶ（同名の既存の線は自動的に置き換え）。デフォルトの円柱は Y 軸方向なので、`start→end` 方向へのクォータニオン回転で向きを合わせる。color / name オプションで複数の線を併存でき、開いて畳むのヒンジ線は `"foldLine_hinge"`（オレンジ）として折り線（赤）と別に表示する。`removeFoldLine` は名前が `foldLine` で始まる線をすべて削除する。

## リソース管理

シーンからオブジェクトを `remove` する際は必ず `disposeObject3D` で geometry / material を破棄し、GPU リソースのリークを防ぐ。板とスナップポイントの一括削除は `removeBoardObjects`（名前が `board*` / `snapPoint_*` のオブジェクトを対象）に共通化されている。

## 関連ソース

| パス | 役割 |
| --- | --- |
| `hooks/useInitScene/index.tsx` | Three.js 初期化・ライト・描画ループ |
| `utils/createBoardMesh/index.ts` | 多角形メッシュ + 枠線の生成 |
| `hooks/useDragDrop/useRenderBoards.tsx` | idle 時の板群・スナップポイント描画 |
| `hooks/useDragDrop/commenceFold.ts` | folding 用のシーン差し替え（ピボット Group 構築） |
| `hooks/useDragDrop/commenceSquashFold.ts` | 開いて畳む用のシーン差し替え（モーフ板構築） |
| `utils/determineFoldRotation/index.ts` | 持ち上がる向きから回転軸を決定 |
| `hooks/useFoldAnimation/index.tsx` | 180 度折りアニメーション（fold / squash の分岐） |
| `utils/createMorphBoardMesh/index.ts` | モーフ板の生成と頂点書き換え |
| `utils/computeSquashAnimationPositions/index.ts` | 開いて畳むの途中経過座標（[09](./09-squash-fold.md)） |
| `hooks/useFlipView/index.tsx` | 視点の裏返し |
| `utils/easeInOutCubic/index.ts` | イージング関数（折り・裏返しで共用） |
| `utils/visualizeFoldLine/index.ts` | 折り線シリンダーの描画・削除 |
| `utils/disposeObject3D/index.ts` | geometry / material の再帰的破棄 |
| `hooks/useDragDrop/removeBoardObjects.ts` | 板・スナップポイントの一括削除 |
| `constants.ts` | `BOARD_LAYER_OFFSET` |

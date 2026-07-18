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

`foldPhase` が folding になったら開始。rAF で 800ms、easeInOutCubic のイージングで `pivotGroup.setRotationFromAxisAngle(axis, 0→π)` を更新する。全ての動く片は折り線の同じ側にあるため、回転軸は全片の頂点をまとめて1回だけ決める。

- アニメーション中は OrbitControls を無効化
- 完了時: 折り線シリンダーを削除し、`completeFold` で履歴へ確定 → idle に戻ると `useRenderBoards` がリプレイ結果（`applyFoldStep` で確定済みの座標）を描画する。アニメーション後の Group の姿勢を座標に反映する処理は不要
- クリーンアップで `cancelAnimationFrame`（アンマウント・フェーズ変化時の停止）

### 方式の比較

| 方式 | 説明 | 評価 |
| --- | --- | --- |
| **ピボット Group 回転（採用）** | Group の変換行列のみ更新。ジオメトリは不変 | GPU の行列計算のみで軽量。コードもシンプル |
| 頂点再計算 | 毎フレーム全頂点を回転し BufferGeometry を再構築 | CPU コスト・GC 負荷が高い |

## 裏返し — useFlipView

カメラを Y 軸周りに 180 度、rAF + easeInOutCubic（600ms）で回転させる。**折り紙のデータは一切変更しない**。裏側から見た状態での折りはドロップ時のカメラ位置から判定する（[05](./05-multi-board-folding.md)）。アニメーション中は OrbitControls とツールバーの各ボタンを無効化する。

## 折り線の可視化 — visualizeFoldLine

2点間を円柱ジオメトリで結ぶ（名前 `"foldLine"` 固定、再呼び出しで自動的に置き換え）。デフォルトの円柱は Y 軸方向なので、`start→end` 方向へのクォータニオン回転で向きを合わせる。

## リソース管理

シーンからオブジェクトを `remove` する際は必ず `disposeObject3D` で geometry / material を破棄し、GPU リソースのリークを防ぐ。板とスナップポイントの一括削除は `removeBoardObjects`（名前が `board*` / `snapPoint_*` のオブジェクトを対象）に共通化されている。

## 関連ソース

| パス | 役割 |
| --- | --- |
| `hooks/useInitScene/index.tsx` | Three.js 初期化・ライト・描画ループ |
| `utils/createBoardMesh/index.ts` | 多角形メッシュ + 枠線の生成 |
| `hooks/useDragDrop/useRenderBoards.tsx` | idle 時の板群・スナップポイント描画 |
| `hooks/useDragDrop/commenceFold.ts` | folding 用のシーン差し替え（ピボット Group 構築） |
| `utils/determineFoldRotation/index.ts` | 持ち上がる向きから回転軸を決定 |
| `hooks/useFoldAnimation/index.tsx` | 180 度折りアニメーション |
| `hooks/useFlipView/index.tsx` | 視点の裏返し |
| `utils/easeInOutCubic/index.ts` | イージング関数（折り・裏返しで共用） |
| `utils/visualizeFoldLine/index.ts` | 折り線シリンダーの描画・削除 |
| `utils/disposeObject3D/index.ts` | geometry / material の再帰的破棄 |
| `hooks/useDragDrop/removeBoardObjects.ts` | 板・スナップポイントの一括削除 |
| `constants.ts` | `BOARD_LAYER_OFFSET` |

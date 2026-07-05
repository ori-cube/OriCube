import * as THREE from "three";
import { PendingFold } from "../../index";
import { FoldStep, LayeredBoard } from "../../types";
import { BOARD_LAYER_OFFSET } from "../../constants";
import { calculateFoldLineSpan } from "../../utils/calculateFoldLineSpan";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import {
  applyFoldStep,
  findFoldCandidates,
  FoldStepResult,
} from "../../utils/applyFoldStep";
import { createBoardMesh } from "../../utils/createBoardMesh";
import { removeBoardObjects } from "./removeBoardObjects";

/**
 * 折りを確定してシーンをアニメーション用の構成に差し替える
 *
 * @param props.scene - Three.jsのシーン
 * @param props.currentBoards - 現在の板群
 * @param props.midpoint - 折り線が通る中点
 * @param props.direction - 折り線の方向ベクトル
 * @param props.dragVertex - ドラッグした頂点の元位置
 * @param props.foldCount - 折る枚数
 * @param props.viewFront - 表側（+Z側）から見ているか
 * @param props.origamiColor - 板の色
 * @returns アニメーション待ちの折り操作。折りが成立しない場合はnull
 *          （シーンは変更しない）
 *
 * @description
 * 1. 折る対象（dragVertexを持つ板の先頭foldCount枚）で折り線のスパンを計算
 * 2. applyFoldStepで折りを適用（成立しない場合はここで打ち切り）
 * 3. 折り線を可視化し、シーンを「動かない板 + 動く片のピボットGroup」に差し替え
 */
export const commenceFold = (props: {
  scene: THREE.Scene;
  currentBoards: LayeredBoard[];
  midpoint: THREE.Vector3;
  direction: THREE.Vector3;
  dragVertex: THREE.Vector3;
  foldCount: number;
  viewFront: boolean;
  origamiColor: string;
}): PendingFold | null => {
  const {
    scene,
    currentBoards,
    midpoint,
    direction,
    dragVertex,
    foldCount,
    viewFront,
    origamiColor,
  } = props;

  const candidates = findFoldCandidates(currentBoards, dragVertex, viewFront);
  if (foldCount < 1 || foldCount > candidates.length) return null;
  const targets = candidates.slice(0, foldCount);

  // 折り線が対象の板を横切る区間を計算（横切らない場合は折り不成立）
  const foldLineSpan = calculateFoldLineSpan(
    midpoint,
    direction,
    targets.map((target) => target.polygon)
  );
  if (!foldLineSpan) return null;

  const step: FoldStep = {
    foldLine: foldLineSpan,
    dragVertex: new THREE.Vector3(dragVertex.x, dragVertex.y, 0),
    foldCount,
    viewFront,
  };

  // 折りを適用（分割できない折り線の場合はnull）
  const result = applyFoldStep(currentBoards, step);
  if (!result) return null;

  // 折り線を可視化（既存のプレビュー折り線があれば置き換わる）
  visualizeFoldLine(scene, foldLineSpan.start, foldLineSpan.end);

  // 板群を「動かない板」と「動く片」に差し替え
  replaceSceneForFolding({
    scene,
    result,
    pivotPoint: foldLineSpan.start,
    origamiColor,
  });

  return { step, movingBoards: result.movingBoards };
};

/**
 * シーン上の板群を、折りアニメーション用の構成に差し替える
 *
 * @param props.scene - Three.jsのシーン
 * @param props.result - 折り操作の適用結果
 * @param props.pivotPoint - 回転の基準点（折り線上の点）
 * @param props.origamiColor - 板の色
 *
 * @description
 * - 既存の板とスナップポイントを削除（リソースも破棄）
 * - 動かない板（対象板の固定片 + 折り対象外の板）は "board_static_*" として
 *   シーンに直接追加
 * - 動く片は "board_moving_*" としてピボットGroup（"board_moving_pivot"）に
 *   入れる
 *   - Groupのpositionを折り線上の点に置き、板メッシュを逆オフセットすることで
 *     ワールド座標を維持したまま、Groupの回転＝折り線周りの回転になる
 * - 各板は重なり順（layer）に応じたZオフセットで配置する
 * - 動く片はpolygonOffsetを有効にして、折り重なった際のz-fightingを防ぐ
 */
const replaceSceneForFolding = (props: {
  scene: THREE.Scene;
  result: FoldStepResult;
  pivotPoint: THREE.Vector3;
  origamiColor: string;
}): void => {
  const { scene, result, pivotPoint, origamiColor } = props;

  // 既存の板とスナップポイントを削除
  removeBoardObjects(scene);

  // 動かない板（対象板の固定片 + 折り対象外の板）
  result.staticBoards.forEach((board, index) => {
    const staticBoardMesh = createBoardMesh(board.polygon, origamiColor, {
      name: `board_static_${index}`,
    });
    staticBoardMesh.position.z = board.layer * BOARD_LAYER_OFFSET;
    scene.add(staticBoardMesh);
  });

  // 動く片（ピボットGroupに入れて折り線周りに回転できるようにする）
  const pivotGroup = new THREE.Group();
  pivotGroup.name = "board_moving_pivot";
  pivotGroup.position.copy(pivotPoint);

  result.movingBoards.forEach((board, index) => {
    const movingBoardMesh = createBoardMesh(board.polygon, origamiColor, {
      name: `board_moving_${index}`,
      enablePolygonOffset: true,
    });
    movingBoardMesh.position.copy(pivotPoint.clone().negate());
    movingBoardMesh.position.z += board.layer * BOARD_LAYER_OFFSET;
    pivotGroup.add(movingBoardMesh);
  });

  scene.add(pivotGroup);
};

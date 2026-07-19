import * as THREE from "three";
import { PendingFold } from "../../index";
import { LayeredBoard } from "../../types";
import { BOARD_LAYER_OFFSET } from "../../constants";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import {
  applyPetalFoldStep,
  buildPetalFoldStep,
  PetalFoldStepResult,
} from "../../utils/applyPetalFoldStep";
import { SNAP_ATTRACTION_RADIUS } from "../../utils/snapToNearestSnapPoint";
import { createBoardMesh } from "../../utils/createBoardMesh";
import { createMorphBoardMesh } from "../../utils/createMorphBoardMesh";
import { removeBoardObjects } from "./removeBoardObjects";

/** かぶせ折り線の表示色（折り線の赤と区別する） */
const KITE_LINE_COLOR = "#ff8c00";

/**
 * 花弁折りを確定してシーンをアニメーション用の構成に差し替える
 *
 * @param props.scene - Three.jsのシーン
 * @param props.currentBoards - 現在の板群
 * @param props.midpoint - ドラッグから計算した折り線が通る中点
 * @param props.direction - ドラッグから計算した折り線の方向ベクトル
 * @param props.dragVertex - ドラッグした頂点の元位置
 * @param props.viewFront - 表側（+Z側）から見ているか
 * @param props.origamiColor - 板の色
 * @returns アニメーション待ちの折り操作。成立しない場合はnull
 *          （シーンは変更しない）
 *
 * @description
 * 1. buildPetalFoldStepで構造から正準化した折り線を持つステップを組み立てる
 * 2. applyPetalFoldStepで花弁折りを適用（成立しない場合はここで打ち切り）
 * 3. 折り線とかぶせ折り線を可視化し、シーンを「動かない板 + 動く片の
 *    モーフ板」に差し替える。動く片は複数の軸で別々に回転するため
 *    ピボットGroupは使わず、毎フレーム頂点座標を書き換える
 *    （useFoldAnimationのpetal分岐）
 */
export const commencePetalFold = (props: {
  scene: THREE.Scene;
  currentBoards: LayeredBoard[];
  midpoint: THREE.Vector3;
  direction: THREE.Vector3;
  dragVertex: THREE.Vector3;
  viewFront: boolean;
  origamiColor: string;
}): PendingFold | null => {
  const {
    scene,
    currentBoards,
    midpoint,
    direction,
    dragVertex,
    viewFront,
    origamiColor,
  } = props;

  const step = buildPetalFoldStep({
    boards: currentBoards,
    midpoint,
    direction,
    dragVertex,
    viewFront,
    acceptanceRadius: SNAP_ATTRACTION_RADIUS,
  });
  if (!step) return null;

  const result = applyPetalFoldStep(currentBoards, step);
  if (!result) return null;

  // 折り線とかぶせ折り線を可視化（既存のプレビュー折り線があれば置き換わる）
  visualizeFoldLine(scene, step.foldLine.start, step.foldLine.end);
  result.kiteLines.forEach((kiteLine, index) => {
    visualizeFoldLine(scene, kiteLine.start, kiteLine.end, {
      color: KITE_LINE_COLOR,
      name: `foldLine_kite_${index}`,
    });
  });

  replaceSceneForPetal({ scene, result, origamiColor });

  return { kind: "petal", step, result };
};

/**
 * シーン上の板群を、花弁折りアニメーション用の構成に差し替える
 *
 * @description
 * - 既存の板とスナップポイントを削除（リソースも破棄）
 * - 動かない板は "board_static_*" としてシーンに直接追加
 * - 動く片は "board_petal_moving_*" のモーフ板として追加し、
 *   useFoldAnimationが毎フレーム頂点座標を書き換える
 * - 各板は重なり順（layer）に応じたZオフセットで配置する
 */
const replaceSceneForPetal = (props: {
  scene: THREE.Scene;
  result: PetalFoldStepResult;
  origamiColor: string;
}): void => {
  const { scene, result, origamiColor } = props;

  // 既存の板とスナップポイントを削除
  removeBoardObjects(scene);

  result.staticBoards.forEach((board, index) => {
    const staticBoardMesh = createBoardMesh(board.polygon, origamiColor, {
      name: `board_static_${index}`,
    });
    staticBoardMesh.position.z = board.layer * BOARD_LAYER_OFFSET;
    scene.add(staticBoardMesh);
  });

  result.movingPieces.forEach((moving, index) => {
    const morphBoardMesh = createMorphBoardMesh(
      moving.piece.polygon,
      origamiColor,
      { name: `board_petal_moving_${index}` }
    );
    morphBoardMesh.position.z = moving.layer * BOARD_LAYER_OFFSET;
    scene.add(morphBoardMesh);
  });
};

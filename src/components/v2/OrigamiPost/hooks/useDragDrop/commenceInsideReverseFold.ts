import * as THREE from "three";
import { PendingFold } from "../../index";
import { LayeredBoard } from "../../types";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import {
  applyInsideReverseFoldStep,
  buildInsideReverseFoldStep,
} from "../../utils/applyInsideReverseFoldStep";
import { replaceSceneForFolding } from "./commenceFold";

/**
 * 中割り折りを確定してシーンをアニメーション用の構成に差し替える
 *
 * @param props.scene - Three.jsのシーン
 * @param props.currentBoards - 現在の板群
 * @param props.midpoint - 折り線が通る中点
 * @param props.direction - 折り線の方向ベクトル
 * @param props.dragVertex - ドラッグした頂点の元位置
 * @param props.viewFront - 表側（+Z側）から見ているか
 * @param props.origamiColor - 板の色
 * @returns アニメーション待ちの折り操作。成立しない場合はnull
 *          （シーンは変更しない）
 *
 * @description
 * 1. buildInsideReverseFoldStepで動かす点を覆う折り線スパンを計算
 * 2. applyInsideReverseFoldStepで中割り折りを適用（成立しない場合は打ち切り）
 * 3. 折り線を可視化し、シーンを「動かない板 + 動く片のピボットGroup」に
 *    差し替える。全ての先端片が折り線周りの同一回転を受けるため、
 *    通常の折りと同じピボット方式で回す（確定後の差し込みレイヤーは
 *    リプレイ結果の再描画で反映される）
 */
export const commenceInsideReverseFold = (props: {
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

  const step = buildInsideReverseFoldStep({
    boards: currentBoards,
    midpoint,
    direction,
    dragVertex,
    viewFront,
  });
  if (!step) return null;

  const result = applyInsideReverseFoldStep(currentBoards, step);
  if (!result) return null;

  // 折り線を可視化（既存のプレビュー折り線があれば置き換わる）
  visualizeFoldLine(scene, step.foldLine.start, step.foldLine.end);

  replaceSceneForFolding({
    scene,
    result,
    pivotPoint: step.foldLine.start,
    origamiColor,
  });

  return { kind: "insideReverse", step, movingBoards: result.movingBoards };
};

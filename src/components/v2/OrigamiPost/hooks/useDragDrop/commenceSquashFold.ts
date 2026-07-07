import * as THREE from "three";
import { PendingFold } from "../../index";
import { LayeredBoard } from "../../types";
import { BOARD_LAYER_OFFSET } from "../../constants";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import {
  applySquashFoldStep,
  buildSquashFoldStep,
  SquashFoldStepResult,
} from "../../utils/applySquashFoldStep";
import { createBoardMesh } from "../../utils/createBoardMesh";
import { createMorphBoardMesh } from "../../utils/createMorphBoardMesh";
import { removeBoardObjects } from "./removeBoardObjects";

/** ヒンジ線の表示色（折り線の赤と区別する） */
const HINGE_LINE_COLOR = "#ff8c00";

/**
 * 開いて畳むを確定してシーンをアニメーション用の構成に差し替える
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
 * 1. buildSquashFoldStepでフラップ2枚を覆う折り線スパンを計算
 * 2. applySquashFoldStepで開いて畳むを適用（成立しない場合はここで打ち切り）
 * 3. 折り線とヒンジ線を可視化し、シーンを「動かない板 + 動く片のモーフ板」に
 *    差し替える。動く片は複数の軸で別々に回転するためピボットGroupは使わず、
 *    毎フレーム頂点座標を書き換える（useFoldAnimationのsquash分岐）
 */
export const commenceSquashFold = (props: {
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

  const step = buildSquashFoldStep({
    boards: currentBoards,
    midpoint,
    direction,
    dragVertex,
    viewFront,
  });
  if (!step) return null;

  const result = applySquashFoldStep(currentBoards, step);
  if (!result) return null;

  // 折り線とヒンジ線を可視化（既存のプレビュー折り線があれば置き換わる）
  visualizeFoldLine(scene, step.foldLine.start, step.foldLine.end);
  visualizeFoldLine(scene, result.hinge.start, result.hinge.end, {
    color: HINGE_LINE_COLOR,
    name: "foldLine_hinge",
  });

  replaceSceneForSquash({ scene, result, origamiColor });

  return { kind: "squash", step, result };
};

/**
 * シーン上の板群を、開いて畳むアニメーション用の構成に差し替える
 *
 * @description
 * - 既存の板とスナップポイントを削除（リソースも破棄）
 * - 動かない板は "board_static_*" としてシーンに直接追加
 * - 動く片は "board_squash_moving_*" のモーフ板として追加し、
 *   useFoldAnimationが毎フレーム頂点座標を書き換える
 * - 各板は重なり順（layer）に応じたZオフセットで配置する
 */
const replaceSceneForSquash = (props: {
  scene: THREE.Scene;
  result: SquashFoldStepResult;
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
      { name: `board_squash_moving_${index}` }
    );
    morphBoardMesh.position.z = moving.layer * BOARD_LAYER_OFFSET;
    scene.add(morphBoardMesh);
  });
};

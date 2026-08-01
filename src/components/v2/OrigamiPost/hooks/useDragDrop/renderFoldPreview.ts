import * as THREE from "three";
import { BOARD_LAYER_OFFSET } from "../../constants";
import { FoldPreview } from "../../utils/computeFoldPreview";
import { createBoardMesh } from "../../utils/createBoardMesh";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import { disposeObject3D } from "../../utils/disposeObject3D";

const PREVIEW_BOARD_NAME = "foldPreviewBoard";
// "foldLine"で始まる名前にして、折り線の一括削除（removeFoldLine）でも消えるようにする
const PREVIEW_LINE_NAME = "foldLinePreview";

// 確定済みの板と区別できるよう、プレビューはゴースト風に薄く表示する
const PREVIEW_BOARD_OPACITY = 0.45;
const PREVIEW_LINE_COLOR = "#ff8c00";
const PREVIEW_LINE_RADIUS = 0.4;

/**
 * ドラッグ中の折りプレビュー（折り線と鏡映後の動く片）をシーンに描画する
 *
 * @param props.scene - Three.jsのシーン
 * @param props.preview - computeFoldPreviewの計算結果
 * @param props.origamiColor - 折り紙の色
 *
 * @description
 * - 毎フレーム呼ばれる前提。既存のプレビューを破棄してから描き直す
 * - 動く片は元の板と同じ高さ（layer * BOARD_LAYER_OFFSET）に、
 *   polygonOffsetで同一平面のちらつきを防ぎつつ半透明で表示する
 * - 折り線はドロップ後の確定表示（赤）と区別できる色で表示する
 */
export const renderFoldPreview = (props: {
  scene: THREE.Scene;
  preview: FoldPreview;
  origamiColor: string;
}): void => {
  const { scene, preview, origamiColor } = props;

  removePreviewBoard(scene);

  const boardMesh = createBoardMesh(preview.movingPolygon, origamiColor, {
    name: PREVIEW_BOARD_NAME,
    enablePolygonOffset: true,
    opacity: PREVIEW_BOARD_OPACITY,
  });
  boardMesh.position.z = preview.layer * BOARD_LAYER_OFFSET;
  scene.add(boardMesh);

  visualizeFoldLine(scene, preview.foldLine.start, preview.foldLine.end, {
    name: PREVIEW_LINE_NAME,
    color: PREVIEW_LINE_COLOR,
    radius: PREVIEW_LINE_RADIUS,
  });
};

/**
 * ドラッグ中の折りプレビューをシーンから削除する（リソースも破棄）
 */
export const removeFoldPreview = (scene: THREE.Scene): void => {
  removePreviewBoard(scene);

  const line = scene.getObjectByName(PREVIEW_LINE_NAME);
  if (line) {
    scene.remove(line);
    disposeObject3D(line);
  }
};

const removePreviewBoard = (scene: THREE.Scene): void => {
  const board = scene.getObjectByName(PREVIEW_BOARD_NAME);
  if (board) {
    scene.remove(board);
    disposeObject3D(board);
  }
};

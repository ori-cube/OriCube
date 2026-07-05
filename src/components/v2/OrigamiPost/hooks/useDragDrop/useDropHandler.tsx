import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { FoldPhase, PendingFold } from "../../index";
import { FoldStep, LayeredBoard } from "../../types";
import { BOARD_LAYER_OFFSET } from "../../constants";
import { calculateFoldLine } from "../../utils/calculateFoldLine";
import { calculateFoldLineSpan } from "../../utils/calculateFoldLineSpan";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import { disposeObject3D } from "../../utils/disposeObject3D";
import {
  applyFoldStep,
  findFoldCandidates,
  FoldStepResult,
} from "../../utils/applyFoldStep";
import { createBoardMesh } from "../../utils/createBoardMesh";
import { removeBoardObjects } from "./removeBoardObjects";

type UseDropHandler = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  currentBoards: LayeredBoard[];
  draggedPoint: Point | null;
  setDraggedPoint: (point: Point | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  originalPoint: THREE.Vector3 | null;
  setOriginalPoint: (point: THREE.Vector3 | null) => void;
  origamiColor: string;
  foldPhase: FoldPhase;
  setFoldPhase: (phase: FoldPhase) => void;
  setPendingFold: (pending: PendingFold | null) => void;
}) => void;

/**
 * マウスドロップ処理を管理するカスタムフック
 *
 * @description
 * - マウスアップ時に折り線を計算し、折る対象の板を分割してシーンを差し替える
 * - 折る対象はドラッグした頂点を持つ板のうち最前面の1枚
 *   （候補が複数ある場合の枚数選択UIは後続PRで追加する）
 * - 折りが成立する場合: 折り線を可視化し、板群を動かない板と動く片に
 *   差し替えてfoldingフェーズへ遷移
 * - 折りが成立しない場合（折り線が板を横切らない等）: 何もせずidleのまま
 *   再ドラッグを待つ
 * - 折りの成否に関わらずドラッグ中の点はクリアする
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.currentBoards - 現在の板群（分割の入力に使用）
 * @param props.draggedPoint - 現在ドラッグ中の点
 * @param props.setDraggedPoint - ドラッグ中の点を設定する関数
 * @param props.origamiColor - 折り紙の色（分割後の板の描画に使用）
 * @param props.foldPhase - 折り操作のフェーズ（idle以外では処理しない）
 * @param props.setFoldPhase - フェーズを遷移させる関数
 * @param props.setPendingFold - アニメーション待ちの折り操作を設定する関数
 */
export const useDropHandler: UseDropHandler = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  currentBoards,
  draggedPoint,
  setDraggedPoint,
  setIsDragging,
  originalPoint,
  setOriginalPoint,
  origamiColor,
  foldPhase,
  setFoldPhase,
  setPendingFold,
}) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    if (!canvas || !scene || !camera || !renderer) return;

    // idle以外のフェーズではドロップ操作を受け付けない
    if (foldPhase !== "idle") return;

    /**
     * 折り線を計算し、成立する場合は板を分割してfoldingフェーズへ遷移する
     */
    const tryFold = (droppedPoint: THREE.Vector3) => {
      if (!originalPoint) return;

      // 折り線を計算（同一点の場合はnull。再ドラッグを待つ）
      const foldLineInfo = calculateFoldLine(originalPoint, droppedPoint);
      if (!foldLineInfo) return;

      // 折る対象: ドラッグした頂点を持つ板のうち最前面の1枚
      const candidates = findFoldCandidates(currentBoards, originalPoint, true);
      if (candidates.length === 0) return;
      const targets = candidates.slice(0, 1);

      // 折り線が対象の板を横切る区間を計算（横切らない場合は再ドラッグを待つ）
      const foldLineSpan = calculateFoldLineSpan(
        foldLineInfo.midpoint,
        foldLineInfo.direction,
        targets.map((target) => target.polygon)
      );
      if (!foldLineSpan) return;

      const step: FoldStep = {
        foldLine: foldLineSpan,
        dragVertex: new THREE.Vector3(originalPoint.x, originalPoint.y, 0),
        foldCount: 1,
        viewFront: true,
      };

      // 折りを適用（分割できない折り線の場合はnull。再ドラッグを待つ）
      const result = applyFoldStep(currentBoards, step);
      if (!result) return;

      // 折り線を可視化
      visualizeFoldLine(scene, foldLineSpan.start, foldLineSpan.end);

      // 板群を「動かない板」と「動く片」に差し替え
      replaceSceneForFolding({
        scene,
        result,
        pivotPoint: foldLineSpan.start,
        origamiColor,
      });

      setPendingFold({ step, movingBoards: result.movingBoards });
      setFoldPhase("folding");
    };

    const handleMouseUp = () => {
      if (!draggedPoint || !originalPoint) return;

      const draggedPointMesh = scene.getObjectByName("draggedPoint");
      if (!draggedPointMesh) return; // ドラッグ終了点が存在しない場合は基本的に起こり得ない。アプリケーションを終了させるべきでもないので、エラーとして処理しない。

      // ドラッグ終了位置を取得
      const droppedPoint = draggedPointMesh.position.clone();

      tryFold(droppedPoint);

      // 折りの成否に関わらずドラッグ中の点をクリアして状態をリセット
      scene.remove(draggedPointMesh);
      disposeObject3D(draggedPointMesh);
      setDraggedPoint(null);
      setIsDragging(false);
      setOriginalPoint(null);

      // シーンを再描画
      renderer.render(scene, camera);
    };

    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    currentBoards,
    draggedPoint,
    setDraggedPoint,
    setIsDragging,
    originalPoint,
    setOriginalPoint,
    origamiColor,
    foldPhase,
    setFoldPhase,
    setPendingFold,
  ]);
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

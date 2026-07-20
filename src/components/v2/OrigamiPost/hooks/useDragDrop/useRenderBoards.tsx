import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { FoldPhase } from "../../index";
import { LayeredBoard } from "../../types";
import { FinishingRotation } from "../../utils/replayFoldSteps";
import { BOARD_LAYER_OFFSET } from "../../constants";
import { SnapPoint } from "../../utils/collectSnapPoints";
import { createBoardMesh } from "../../utils/createBoardMesh";
import { renderSnapPoint } from "./renderPoint";
import { removeBoardObjects } from "./removeBoardObjects";

type UseRenderBoards = (props: {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  origamiColor: string;
  currentBoards: LayeredBoard[];
  finishingRotations: Map<LayeredBoard, FinishingRotation>;
  snapPoints: SnapPoint[];
  draggedPoint: Point | null;
  foldPhase: FoldPhase;
}) => void;

/**
 * 現在の板群とスナップポイントの描画を管理するカスタムフック
 *
 * @description
 * - 既存の板とスナップポイントをクリアしてから描画する
 * - 各板は重なり順（layer）に応じて z = layer * BOARD_LAYER_OFFSET へ浮かせる
 * - スナップポイントは集約済みの頂点位置に配置（ドラッグ中の点は除外）
 * - viewingフェーズ（ビューモード）ではスナップポイントを表示しない
 * - selecting / foldingフェーズでは折りアニメーション用のシーンが
 *   表示されているため描画しない
 *
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.origamiColor - 折り紙の色
 * @param props.currentBoards - 現在の板群
 * @param props.snapPoints - 集約済みのスナップポイント
 * @param props.draggedPoint - 現在ドラッグ中の点（描画から除外）
 * @param props.foldPhase - 折り操作のフェーズ
 */
export const useRenderBoards: UseRenderBoards = ({
  sceneRef,
  rendererRef,
  cameraRef,
  origamiColor,
  currentBoards,
  finishingRotations,
  snapPoints,
  draggedPoint,
  foldPhase,
}) => {
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;

    if (!scene || !renderer || !camera) return;

    // selecting / foldingフェーズでは折りアニメーション用のシーンが表示されている
    if (foldPhase !== "idle" && foldPhase !== "viewing") return;

    const isViewing = foldPhase === "viewing";

    removeBoardObjects(scene);

    // 板を重なり順に応じたZオフセットで描画。仕上げ角度の板は
    // 平面プロキシの位置から折り線周りに(angle - π)回転した姿勢で表示する
    currentBoards.forEach((board, index) => {
      const boardMesh = createBoardMesh(board.polygon, origamiColor, {
        name: `board_${index}`,
      });
      const rotation = finishingRotations.get(board);
      if (!rotation) {
        boardMesh.position.z = board.layer * BOARD_LAYER_OFFSET;
        scene.add(boardMesh);
        return;
      }

      const pivotGroup = new THREE.Group();
      pivotGroup.name = `board_finishing_${index}`;
      pivotGroup.position.copy(rotation.origin);
      pivotGroup.setRotationFromAxisAngle(
        rotation.axis,
        rotation.angle - Math.PI
      );
      boardMesh.position.copy(rotation.origin.clone().negate());
      boardMesh.position.z += board.layer * BOARD_LAYER_OFFSET;
      pivotGroup.add(boardMesh);
      scene.add(pivotGroup);
    });

    // スナップポイントを描画（ドラッグ中の点は除外。ビューモードでは非表示）
    if (isViewing) {
      renderer.render(scene, camera);
      return;
    }
    snapPoints.forEach((snapPoint, index) => {
      const point: Point = [
        snapPoint.position.x,
        snapPoint.position.y,
        snapPoint.position.z,
      ];

      if (draggedPoint && isSamePoint(point, draggedPoint)) {
        return;
      }

      renderSnapPoint({
        scene,
        point,
        name: `snapPoint_${index}`,
      });
    });

    renderer.render(scene, camera);
  }, [
    sceneRef,
    rendererRef,
    cameraRef,
    origamiColor,
    currentBoards,
    finishingRotations,
    snapPoints,
    draggedPoint,
    foldPhase,
  ]);
};

// 2つの点が同じかどうかを判定
const isSamePoint = (point1: Point, point2: Point): boolean => {
  const tolerance = 0.1;
  return (
    Math.abs(point1[0] - point2[0]) < tolerance &&
    Math.abs(point1[1] - point2[1]) < tolerance &&
    Math.abs(point1[2] - point2[2]) < tolerance
  );
};

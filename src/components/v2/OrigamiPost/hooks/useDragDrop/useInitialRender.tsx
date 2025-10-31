import { useEffect } from "react";
import * as THREE from "three";
import { Board, Point } from "../../types";
import { renderOrigamiBoard } from "./renderOrigamiBoard";
import { renderSnapPoint } from "./renderPoint";

type UseInitialRender = (props: {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  origamiColor: string;
  size: number;
  initialBoard: Board;
  draggedPoint: Point | null;
}) => void;

/**
 * 折り紙とスナップポイントの初期描画を管理するカスタムフック
 *
 * @description
 * - 既存の折り紙とスナップポイントをクリア
 * - 折り紙の板を描画（色・サイズ指定）
 * - 正方形の4つの頂点にスナップポイントを配置
 * - ドラッグ中の点は描画から除外
 * - シーンを再描画
 *
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.origamiColor - 折り紙の色
 * @param props.size - 折り紙のサイズ
 * @param props.initialBoard - 初期折り紙の板
 * @param props.draggedPoint - 現在ドラッグ中の点（描画から除外）
 */
export const useInitialRender: UseInitialRender = ({
  sceneRef,
  rendererRef,
  cameraRef,
  origamiColor,
  size,
  initialBoard,
  draggedPoint,
}) => {
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;

    if (!scene || !renderer || !camera) return;

    // シーンの初期化（既存のオブジェクトをクリア）
    const existingObjects = scene.children.filter(
      (child) => child.name === "origami" || child.name === "snapPoint"
    );
    existingObjects.forEach((obj) => scene.remove(obj));

    // 折り紙の板を描画
    renderOrigamiBoard({
      scene,
      origamiColor,
      size,
    });

    // スナップポイント（頂点）を描画（ドラッグ中の点は除外）
    initialBoard.forEach((vertex, index) => {
      // ドラッグ中の点は描画しない
      if (draggedPoint && isSamePoint(vertex, draggedPoint)) {
        return;
      }

      renderSnapPoint({
        scene,
        point: vertex,
        name: `snapPoint_${index}`,
      });
    });

    renderer.render(scene, camera);
  }, [
    sceneRef,
    rendererRef,
    cameraRef,
    origamiColor,
    size,
    draggedPoint,
    initialBoard,
  ]);
};

// 2つの点が同じかどうかを判定
const isSamePoint = (point1: Point, point2: Point): boolean => {
  const tolerance = 0.1;
  return (
    Math.abs(point1.x - point2.x) < tolerance &&
    Math.abs(point1.y - point2.y) < tolerance &&
    Math.abs(point1.z - point2.z) < tolerance
  );
};

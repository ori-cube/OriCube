import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { FoldPhase } from "../../index";
import { Board } from "../../types";
import { renderOrigamiBoard } from "./renderOrigamiBoard";
import { renderSnapPoint } from "./renderPoint";
import { disposeObject3D } from "../../utils/disposeObject3D";

type UseInitialRender = (props: {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  origamiColor: string;
  size: number;
  initialBoard: Board;
  draggedPoint: Point | null;
  foldPhase: FoldPhase;
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
 * @param props.initialBoard - 折り紙の初期の板（スナップポイントの配置に使用）
 * @param props.draggedPoint - 現在ドラッグ中の点（描画から除外）
 * @param props.foldPhase - 折り操作のフェーズ（idle以外では描画しない）
 */
export const useInitialRender: UseInitialRender = ({
  sceneRef,
  rendererRef,
  cameraRef,
  origamiColor,
  size,
  initialBoard,
  draggedPoint,
  foldPhase,
}) => {
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;

    if (!scene || !renderer || !camera) return;

    // idle以外のフェーズでは分割後の板が表示されているため、初期描画を行わない
    if (foldPhase !== "idle") return;

    // シーンの初期化（既存のオブジェクトをクリア）
    const existingObjects = scene.children.filter(
      (child) =>
        child.name === "origami" || child.name.startsWith("snapPoint_")
    );
    existingObjects.forEach((obj) => {
      scene.remove(obj);
      disposeObject3D(obj);
    });

    // 折り紙の板を描画
    renderOrigamiBoard({
      scene,
      origamiColor,
      size,
    });

    // スナップポイント（頂点）を描画（ドラッグ中の点は除外）
    initialBoard.forEach((vertex, index) => {
      const point: Point = [vertex.x, vertex.y, vertex.z];

      // ドラッグ中の点は描画しない
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
    size,
    initialBoard,
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

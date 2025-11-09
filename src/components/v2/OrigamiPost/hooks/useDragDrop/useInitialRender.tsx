import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { renderOrigamiBoard } from "./renderOrigamiBoard";
import { renderSnapPoint } from "./renderPoint";

type UseInitialRender = (props: {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  origamiColor: string;
  size: number;
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
 * @param props.draggedPoint - 現在ドラッグ中の点（描画から除外）
 */
export const useInitialRender: UseInitialRender = ({
  sceneRef,
  rendererRef,
  cameraRef,
  origamiColor,
  size,
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
    const vertices = generateVertices(size);
    vertices.forEach((vertex, index) => {
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
  }, [sceneRef, rendererRef, cameraRef, origamiColor, size, draggedPoint]);
};

// 正方形の頂点を生成（XY平面、Z=0）
const generateVertices = (size: number): Point[] => {
  const halfSize = size / 2;
  return [
    [-halfSize, -halfSize, 0], // 左下
    [halfSize, -halfSize, 0], // 右下
    [halfSize, halfSize, 0], // 右上
    [-halfSize, halfSize, 0], // 左上
  ];
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

import React, { useState } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { useInitialRender } from "./useInitialRender";
import { useDragHandler } from "./useDragHandler";
import { useDropHandler } from "./useDropHandler";

type UseDragDrop = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  origamiColor: string;
  size: number;
}) => void;

/**
 * 折り紙の頂点のドラッグ&ドロップ機能を管理するカスタムフック
 *
 * @description
 * - 折り紙の頂点をドラッグして移動する機能を提供
 * - ドラッグ中の状態管理（draggedPoint, isDragging）
 * - 初期描画、ドラッグ処理、ドロップ処理を統合
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.raycasterRef - THREE.Raycasterのref
 * @param props.origamiColor - 折り紙の色
 * @param props.size - 折り紙のサイズ
 */
export const useDragDrop: UseDragDrop = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  raycasterRef,
  origamiColor,
  size,
}) => {
  const [draggedPoint, setDraggedPoint] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 初期描画（ドラッグ中の点は除外）
  useInitialRender({
    sceneRef,
    rendererRef,
    cameraRef,
    origamiColor,
    size,
    draggedPoint,
  });

  // ドラッグ処理
  useDragHandler({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    setDraggedPoint,
    setIsDragging,
  });

  // ドロップ処理
  useDropHandler({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    draggedPoint,
    setDraggedPoint,
    setIsDragging,
  });
};

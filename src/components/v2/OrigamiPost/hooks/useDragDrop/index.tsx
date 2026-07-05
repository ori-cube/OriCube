import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { FoldPhase, PendingFold } from "../../index";
import { LayeredBoard } from "../../types";
import { collectSnapPoints } from "../../utils/collectSnapPoints";
import { useRenderBoards } from "./useRenderBoards";
import { useDragHandler } from "./useDragHandler";
import { useDropHandler } from "./useDropHandler";

type UseDragDrop = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  origamiColor: string;
  currentBoards: LayeredBoard[];
  originalPoint: THREE.Vector3 | null;
  setOriginalPoint: (point: THREE.Vector3 | null) => void;
  foldPhase: FoldPhase;
  setFoldPhase: (phase: FoldPhase) => void;
  setPendingFold: (pending: PendingFold | null) => void;
}) => void;

/**
 * 折り紙の頂点のドラッグ&ドロップ機能を管理するカスタムフック
 *
 * @description
 * - 現在の板群とスナップポイントの描画、ドラッグ処理、ドロップ処理を統合
 * - スナップポイントは全ての板の頂点を集約したもの（重なった頂点は1つに集約）
 * - ドラッグ中の状態管理（draggedPoint, isDragging）
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.raycasterRef - THREE.Raycasterのref
 * @param props.origamiColor - 折り紙の色
 * @param props.currentBoards - 現在の板群（履歴のリプレイで導出したもの）
 * @param props.foldPhase - 折り操作のフェーズ（idle以外ではドラッグ&ドロップ無効）
 * @param props.setPendingFold - アニメーション待ちの折り操作を設定する関数
 */
export const useDragDrop: UseDragDrop = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  raycasterRef,
  origamiColor,
  currentBoards,
  originalPoint,
  setOriginalPoint,
  foldPhase,
  setFoldPhase,
  setPendingFold,
}) => {
  const [draggedPoint, setDraggedPoint] = useState<Point | null>(null);
  const [, setIsDragging] = useState(false);

  // 全ての板の頂点を集約したスナップポイント
  const snapPoints = useMemo(
    () => collectSnapPoints(currentBoards),
    [currentBoards]
  );

  // 現在の板群とスナップポイントの描画（ドラッグ中の点は除外）
  useRenderBoards({
    sceneRef,
    rendererRef,
    cameraRef,
    origamiColor,
    currentBoards,
    snapPoints,
    draggedPoint,
    foldPhase,
  });

  // ドラッグ処理
  useDragHandler({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    snapPoints,
    setDraggedPoint,
    setIsDragging,
    setOriginalPoint,
    foldPhase,
  });

  // ドロップ処理
  useDropHandler({
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
  });
};

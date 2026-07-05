import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { FoldLineState, FoldPhase } from "../../index";
import { MovingAndStaticBoards } from "../../utils/selectMovingBoard";
import { createSquareBoard } from "../../utils/createSquareBoard";
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
  originalPoint: THREE.Vector3 | null;
  setOriginalPoint: (point: THREE.Vector3 | null) => void;
  setFoldLineState: (state: FoldLineState | null) => void;
  foldPhase: FoldPhase;
  setFoldPhase: (phase: FoldPhase) => void;
  setFoldBoards: (boards: MovingAndStaticBoards | null) => void;
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
 * @param props.foldPhase - 折り操作のフェーズ（idle以外ではドラッグ&ドロップ無効）
 */
export const useDragDrop: UseDragDrop = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  raycasterRef,
  origamiColor,
  size,
  originalPoint,
  setOriginalPoint,
  setFoldLineState,
  foldPhase,
  setFoldPhase,
  setFoldBoards,
}) => {
  const [draggedPoint, setDraggedPoint] = useState<Point | null>(null);
  const [, setIsDragging] = useState(false);

  // 折り紙の初期の板。生成はここ1箇所のみで、各サブフックはこれを参照する
  const initialBoard = useMemo(() => createSquareBoard(size), [size]);

  // 初期描画（ドラッグ中の点は除外）
  useInitialRender({
    sceneRef,
    rendererRef,
    cameraRef,
    origamiColor,
    size,
    initialBoard,
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
    setDraggedPoint,
    setIsDragging,
    initialBoard,
    setOriginalPoint,
    foldPhase,
  });

  // ドロップ処理
  useDropHandler({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    initialBoard,
    draggedPoint,
    setDraggedPoint,
    setIsDragging,
    originalPoint,
    setOriginalPoint,
    size,
    origamiColor,
    setFoldLineState,
    foldPhase,
    setFoldPhase,
    setFoldBoards,
  });
};

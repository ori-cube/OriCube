"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { useInitScene, useDragDrop } from "./hooks";
import styles from "./index.module.scss";

export interface OrigamiPostV2Props {
  /** 折り紙の色 */
  origamiColor?: string;
  /** 折り紙のサイズ */
  size?: number;
  /** カメラの初期位置 */
  cameraPosition?: { x: number; y: number; z: number };
  /** カンバスの幅 */
  width?: number;
  /** カンバスの高さ */
  height?: number;
}

/**
 * Three.jsを使用した折り紙のドラッグ&ドロップ機能付きコンポーネント
 *
 * @description
 * - Three.jsで3D折り紙を描画
 * - 折り紙の頂点をドラッグして移動可能
 * - カメラの回転・ズーム機能
 * - レスポンシブ対応
 *
 * @param props.origamiColor - 折り紙の色（デフォルト: "#4A90E2"）
 * @param props.size - 折り紙のサイズ（デフォルト: 100）
 * @param props.cameraPosition - カメラの初期位置（デフォルト: {x: 0, y: 150, z: 0}）
 * @param props.width - カンバスの幅（デフォルト: window.innerWidth - 320）
 * @param props.height - カンバスの高さ（デフォルト: window.innerHeight）
 */
export const OrigamiPostV2: React.FC<OrigamiPostV2Props> = ({
  origamiColor = "#4A90E2",
  size = 100,
  cameraPosition = { x: 0, y: 150, z: 0 },
  width = window.innerWidth - 320,
  height = window.innerHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);

  // シーンの初期化
  useInitScene({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    raycasterRef,
    width,
    height,
    cameraPosition,
  });

  // ドラッグ&ドロップ機能
  useDragDrop({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    origamiColor,
    size,
  });

  return (
    <canvas
      ref={canvasRef}
      id="origami-canvas"
      className={styles.canvas}
      style={{ width, height }}
    />
  );
};

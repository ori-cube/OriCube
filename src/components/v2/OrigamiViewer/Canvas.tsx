"use client";

import { useEffect, useRef, useState } from "react";
import type { FixBoardV2 } from "@/types/model-v2";
import { createViewerScene, type CameraPreset } from "./scene";
import type { ViewerStep } from "./playback";
import styles from "./Canvas.module.css";

export interface OrigamiCanvasProps {
  size: number;
  color: string;
  step?: ViewerStep;
  progress: number;
  finalBoards: FixBoardV2[];
  flatFinalBoards?: FixBoardV2[];
  finalViewFront: boolean;
  cameraPreset?: CameraPreset;
  resetKey?: number;
  zoom?: number;
  label: string;
}

export function OrigamiCanvas({ size, color, step, progress, finalBoards, flatFinalBoards = finalBoards, finalViewFront, cameraPreset = "front", resetKey = 0, zoom = 1, label }: OrigamiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createViewerScene>>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    try {
      sceneRef.current = createViewerScene(canvas, container, size);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    const handleContextLoss = (event: Event) => { event.preventDefault(); setFailed(true); };
    canvas.addEventListener("webglcontextlost", handleContextLoss);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      sceneRef.current?.dispose();
      sceneRef.current = undefined;
    };
  }, [size, resetKey]);
  useEffect(() => { sceneRef.current?.setContent(step, finalBoards, color, finalViewFront, false, true, flatFinalBoards); }, [step, finalBoards, flatFinalBoards, color, finalViewFront, size, resetKey]);
  useEffect(() => { sceneRef.current?.setCamera(cameraPreset); }, [cameraPreset, step, size, resetKey]);
  useEffect(() => { sceneRef.current?.setZoom(zoom); }, [zoom, step, size, resetKey]);
  useEffect(() => { sceneRef.current?.setProgress(progress); }, [progress, step, color, finalBoards, finalViewFront, size, resetKey]);
  return <div ref={containerRef} className={styles.container}>
    <canvas key={`${size}-${resetKey}`} ref={canvasRef} className={styles.canvas} role="img" aria-label={label} tabIndex={0} onKeyDown={(event) => {
      const movement: Record<string, [number, number]> = { ArrowLeft: [-Math.PI / 12, 0], ArrowRight: [Math.PI / 12, 0], ArrowUp: [0, -Math.PI / 12], ArrowDown: [0, Math.PI / 12] };
      const delta = movement[event.key];
      if (delta) { event.preventDefault(); sceneRef.current?.rotateCamera(...delta); }
    }} />
    {failed && <p className={styles.error} role="alert">3D表示を読み込めませんでした。「視点を戻す」で再試行してください。</p>}
  </div>;
}

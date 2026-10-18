"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { FixBoardV2, ViewerStep } from "@oricube/engine";
import { createViewerScene, type CameraPreset, type CaptureOptions } from "./scene";
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

/** 親から呼べる操作。サムネイルの撮影に使う */
export interface OrigamiCanvasHandle {
  /** 今の視点で、ビュー中央の正方形と同じ範囲を画像にする。3D表示が使えなければ失敗する */
  capture(options: CaptureOptions): Promise<Blob>;
  /** 作品を画面内で回す（ラジアン、正で反時計回り）。resetKey が変わると元に戻る */
  rotateModel(angle: number): void;
}

export const OrigamiCanvas = forwardRef<OrigamiCanvasHandle, OrigamiCanvasProps>(function OrigamiCanvas({ size, color, step, progress, finalBoards, flatFinalBoards = finalBoards, finalViewFront, cameraPreset = "front", resetKey = 0, zoom = 1, label }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createViewerScene>>();
  const [failed, setFailed] = useState(false);
  useImperativeHandle(ref, () => ({
    capture: (options) => sceneRef.current && !failed ? sceneRef.current.capture(options) : Promise.reject(new Error("3D表示を読み込めていません")),
    rotateModel: (angle) => sceneRef.current?.rotateModel(angle),
  }), [failed]);
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
    {failed && <p className={styles.error} role="alert">3D表示を読み込めませんでした。「視点をリセット」で再試行してください。</p>}
  </div>;
});

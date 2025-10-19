import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";

type UseDropHandler = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  draggedPoint: Point | null;
  setDraggedPoint: (point: Point | null) => void;
  setIsDragging: (isDragging: boolean) => void;
}) => void;

/**
 * マウスドロップ処理を管理するカスタムフック
 *
 * @description
 * - マウスアップ時にドラッグ中の点をクリア
 * - ドラッグ中の点のメッシュをシーンから削除
 * - シーンを再描画して状態を更新
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.draggedPoint - 現在ドラッグ中の点
 * @param props.setDraggedPoint - ドラッグ中の点を設定する関数
 */
export const useDropHandler: UseDropHandler = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  draggedPoint,
  setDraggedPoint,
  setIsDragging,
}) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    if (!canvas || !scene || !camera || !renderer) return;

    const handleMouseUp = () => {
      if (draggedPoint) {
        // ドラッグ中の点をクリア
        const draggedPointMesh = scene.getObjectByName("draggedPoint");
        if (draggedPointMesh) {
          scene.remove(draggedPointMesh);
        }

        setDraggedPoint(null);
        setIsDragging(false);

        // シーンを再描画
        renderer.render(scene, camera);
      }
    };

    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    draggedPoint,
    setDraggedPoint,
    setIsDragging,
  ]);
};

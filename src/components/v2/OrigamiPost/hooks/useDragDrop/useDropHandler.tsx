import { useEffect } from "react";
import * as THREE from "three";
import { Board, Point } from "../../types";
import { FoldLineState } from "../../index";
import { calculateFoldLine } from "../../utils/calculateFoldLine";
import { calculateFoldLineIntersections } from "../../utils/calculateFoldLineIntersections";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import { dividePlane } from "../../utils/dividePlane";

type UseDropHandler = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  draggedPoint: Point | null;
  setDraggedPoint: (point: Point | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  originalPoint: THREE.Vector3 | null;
  setOriginalPoint: (point: THREE.Vector3 | null) => void;
  initialBoard: Board;
  setFoldLineState: (state: FoldLineState | null) => void;
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
 * @param props.initialBoard - 初期折り紙の板
 */
export const useDropHandler: UseDropHandler = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  draggedPoint,
  setDraggedPoint,
  setIsDragging,
  originalPoint,
  setOriginalPoint,
  initialBoard,
  setFoldLineState,
}) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    if (!canvas || !scene || !camera || !renderer) return;

    const handleMouseUp = () => {
      if (draggedPoint && originalPoint) {
        // ドラッグ終了位置を取得
        const draggedPointMesh = scene.getObjectByName("draggedPoint");
        if (!draggedPointMesh) return; // ドラッグ終了点が存在しない場合は基本的に起こり得ない。アプリケーションを終了させるべきでもないので、エラーとして処理しない。

        // ドラッグ終了位置を取得
        const droppedPoint = new THREE.Vector3(
          draggedPointMesh.position.x,
          draggedPointMesh.position.y,
          draggedPointMesh.position.z
        );

        // 折り線を計算
        const foldLine = calculateFoldLine(originalPoint, droppedPoint);
        if (!foldLine) return; // 折り線が見つからない場合、もう一度ドラッグを行う必要があるので、エラーとして処理しない。

        try {
          // 折り紙境界との交点を計算
          const { start, end } = calculateFoldLineIntersections({
            midpoint: foldLine.midpoint,
            direction: foldLine.direction,
            initialBoard,
          });

          // 折り線情報を状態に保存
          setFoldLineState({
            midpoint: foldLine.midpoint,
            direction: foldLine.direction,
            start,
            end,
          });

          // 折り線を可視化
          visualizeFoldLine(scene, start, end);

          // 板を分割
          const { movingPart, fixedPart } = dividePlane({
            plane: initialBoard,
            foldLineStart: start,
            foldLineEnd: end,
            originalPoint: originalPoint,
          });

          console.log("movingPart", movingPart);
          console.log("fixedPart", fixedPart);
        } catch (error) {
          console.error("Invalid fold line:", error);
        }

        // ドラッグ中の点をクリア
        scene.remove(draggedPointMesh);

        // 状態をリセット
        setDraggedPoint(null);
        setIsDragging(false);
        setOriginalPoint(null);

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
    originalPoint,
    setOriginalPoint,
    initialBoard,
    setFoldLineState,
  ]);
};

import { useEffect } from "react";
import * as THREE from "three";
import { Board, Point } from "../../types";
import { renderDraggedPoint } from "./renderPoint";

type UseDragHandler = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  setDraggedPoint: (point: Point | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  initialBoard: Board;
  setOriginalPoint: (point: THREE.Vector3 | null) => void;
}) => void;

/**
 * マウスドラッグ処理を管理するカスタムフック
 *
 * @description
 * - マウスダウン時にスナップポイントとの交差を検出
 * - ドラッグ中の点を赤色で表示
 * - マウス移動時にドラッグ中の点の位置を更新
 * - マウスアップ時にドラッグ状態をリセット
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.raycasterRef - THREE.Raycasterのref
 * @param props.setDraggedPoint - ドラッグ中の点を設定する関数
 * @param props.initialBoard - 初期折り紙の板
 */
export const useDragHandler: UseDragHandler = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  raycasterRef,
  setDraggedPoint,
  setIsDragging,
  initialBoard,
  setOriginalPoint,
}) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const raycaster = raycasterRef.current;

    if (!canvas || !scene || !camera || !renderer || !raycaster) return;

    let isDragging = false;
    let draggedPoint: Point | null = null;

    const handleMouseDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      console.log("mouse", mouse);

      raycaster.setFromCamera(mouse, camera);

      // スナップポイントとの交差をチェック
      const snapPoints = scene.children.filter((child) =>
        child.name.startsWith("snapPoint_")
      );

      const intersects = raycaster.intersectObjects(snapPoints);

      if (intersects.length > 0) {
        const intersectedPoint = intersects[0].object;
        const pointIndex = parseInt(intersectedPoint.name.split("_")[1]);

        if (initialBoard[pointIndex]) {
          draggedPoint = initialBoard[pointIndex];
          setDraggedPoint(draggedPoint);
          setIsDragging(true);
          isDragging = true;

          // ドラッグ開始時の元の位置を保存
          setOriginalPoint(initialBoard[pointIndex]);

          // ドラッグ中の点を描画
          renderDraggedPoint({
            scene,
            point: draggedPoint,
            name: "draggedPoint",
          });

          renderer.render(scene, camera);
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !draggedPoint) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      // 地面との交差を計算してドラッグ中の点の位置を更新（XY平面: Z=0）
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();

      if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
        // ドラッグ中の点の位置を更新
        const draggedPointMesh = scene.getObjectByName("draggedPoint");
        if (draggedPointMesh) {
          draggedPointMesh.position.set(
            intersection.x,
            intersection.y,
            intersection.z
          );
          renderer.render(scene, camera);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        isDragging = false;
        // ドラッグ終了時の処理はuseDropHandlerで行う
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    setDraggedPoint,
    setIsDragging,
    initialBoard,
    setOriginalPoint,
  ]);
};

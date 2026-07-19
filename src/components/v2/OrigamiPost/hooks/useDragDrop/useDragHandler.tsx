import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { FoldPhase } from "../../index";
import { LayeredBoard } from "../../types";
import { SnapPoint } from "../../utils/collectSnapPoints";
import { snapToNearestSnapPoint } from "../../utils/snapToNearestSnapPoint";
import { collectAlignmentSnapPoints } from "../../utils/collectAlignmentSnapPoints";
import { renderDraggedPoint } from "./renderPoint";

type UseDragHandler = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  currentBoards: LayeredBoard[];
  snapPoints: SnapPoint[];
  setDraggedPoint: (point: Point | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setOriginalPoint: (point: THREE.Vector3 | null) => void;
  foldPhase: FoldPhase;
}) => void;

/**
 * マウスドラッグ処理を管理するカスタムフック
 *
 * @description
 * - マウスダウン時にスナップポイントとの交差を検出
 * - ドラッグ中の点を赤色で表示
 * - マウス移動時にドラッグ中の点の位置を更新。近くの吸着先（頂点の
 *   スナップポイント + 辺の折り込み先=アライメント候補）があれば
 *   その座標へ吸着させる
 * - マウスアップ時にドラッグ状態をリセット
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.raycasterRef - THREE.Raycasterのref
 * @param props.currentBoards - 現在の板群（アライメント候補の計算に使用）
 * @param props.snapPoints - 集約済みのスナップポイント
 * @param props.setDraggedPoint - ドラッグ中の点を設定する関数
 */
export const useDragHandler: UseDragHandler = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  raycasterRef,
  currentBoards,
  snapPoints,
  setDraggedPoint,
  setIsDragging,
  setOriginalPoint,
  foldPhase,
}) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const raycaster = raycasterRef.current;

    if (!canvas || !scene || !camera || !renderer || !raycaster) return;

    // idle以外のフェーズではドラッグ操作を受け付けない
    if (foldPhase !== "idle") return;

    let isDragging = false;
    let draggedPoint: Point | null = null;
    // ドラッグ中の吸着先（頂点のスナップポイント + ドラッグ頂点に応じた
    // アライメント候補）。ドラッグ開始時に計算する
    let snapTargets: THREE.Vector3[] = [];

    const handleMouseDown = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      // スナップポイントとの交差をチェック
      const snapPointMeshes = scene.children.filter((child) =>
        child.name.startsWith("snapPoint_")
      );

      const intersects = raycaster.intersectObjects(snapPointMeshes);

      if (intersects.length > 0) {
        const intersectedPoint = intersects[0].object;
        const pointIndex = parseInt(intersectedPoint.name.split("_")[1]);
        const snapPoint = snapPoints[pointIndex];

        if (snapPoint) {
          const position = snapPoint.position;
          draggedPoint = [position.x, position.y, position.z];
          setDraggedPoint(draggedPoint);
          setIsDragging(true);
          isDragging = true;

          // ドラッグ開始時の元の位置を保存
          setOriginalPoint(position.clone());

          // 吸着先を計算: 全頂点のスナップポイントに、このドラッグ頂点の
          // 辺の折り込み先（アライメント候補）を加える
          snapTargets = [
            ...snapPoints.map((snapPoint) => snapPoint.position),
            ...collectAlignmentSnapPoints(currentBoards, position),
          ];

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
        // 近くの吸着先があればその座標へ吸着させる（頂点同士や辺の
        // 折り込み先へ正確に重なり、ドロップ時に綺麗な折り線を作れる）
        const snappedPosition = snapToNearestSnapPoint(
          intersection,
          snapTargets
        );

        // ドラッグ中の点の位置を更新
        const draggedPointMesh = scene.getObjectByName("draggedPoint");
        if (draggedPointMesh) {
          draggedPointMesh.position.copy(snappedPosition);
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
    currentBoards,
    snapPoints,
    setDraggedPoint,
    setIsDragging,
    setOriginalPoint,
    foldPhase,
  ]);
};

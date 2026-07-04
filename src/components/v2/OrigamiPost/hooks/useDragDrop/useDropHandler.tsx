import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { FoldLineState, FoldPhase } from "../../index";
import { FoldLine } from "../../types";
import { calculateFoldLine } from "../../utils/calculateFoldLine";
import { calculateFoldLineIntersections } from "../../utils/calculateFoldLineIntersections";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import { disposeObject3D } from "../../utils/disposeObject3D";
import { createSquareBoard } from "../../utils/createSquareBoard";
import { separateBoard } from "../../utils/separateBoard";
import {
  selectMovingBoard,
  MovingAndStaticBoards,
} from "../../utils/selectMovingBoard";
import { createBoardMesh } from "../../utils/createBoardMesh";

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
  size: number;
  origamiColor: string;
  setFoldLineState: (state: FoldLineState | null) => void;
  foldPhase: FoldPhase;
  setFoldPhase: (phase: FoldPhase) => void;
  setFoldBoards: (boards: MovingAndStaticBoards | null) => void;
}) => void;

/**
 * マウスドロップ処理を管理するカスタムフック
 *
 * @description
 * - マウスアップ時に折り線を計算し、板を2つに分割してシーンを差し替える
 * - 折りが成立する場合: 折り線を可視化し、折り紙を固定板と動く板に
 *   差し替えてfoldingフェーズへ遷移
 * - 折りが成立しない場合（折り線が板を横切らない等）: 何もせずidleのまま
 *   再ドラッグを待つ
 * - 折りの成否に関わらずドラッグ中の点はクリアする
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.draggedPoint - 現在ドラッグ中の点
 * @param props.setDraggedPoint - ドラッグ中の点を設定する関数
 * @param props.origamiColor - 折り紙の色（分割後の板の描画に使用）
 * @param props.foldPhase - 折り操作のフェーズ（idle以外では処理しない）
 * @param props.setFoldPhase - フェーズを遷移させる関数
 * @param props.setFoldBoards - 分割された板を保存する関数
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
  size,
  origamiColor,
  setFoldLineState,
  foldPhase,
  setFoldPhase,
  setFoldBoards,
}) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    if (!canvas || !scene || !camera || !renderer) return;

    // idle以外のフェーズではドロップ操作を受け付けない
    if (foldPhase !== "idle") return;

    /**
     * 折り線を計算し、成立する場合は板を分割してfoldingフェーズへ遷移する
     */
    const tryFold = (droppedPoint: THREE.Vector3) => {
      if (!originalPoint) return;

      // 折り線を計算（同一点の場合はnull。再ドラッグを待つ）
      const foldLine = calculateFoldLine(originalPoint, droppedPoint);
      if (!foldLine) return;

      try {
        // 折り紙境界との交点を計算
        const intersections = calculateFoldLineIntersections(
          foldLine.midpoint,
          foldLine.direction,
          size
        );
        const foldLineSegment: FoldLine = {
          start: intersections.start,
          end: intersections.end,
        };

        // 板を折り線で2つに分割
        const separated = separateBoard(
          createSquareBoard(size),
          foldLineSegment
        );
        if (!separated) return; // 分割できない折り線。再ドラッグを待つ

        // ドラッグした頂点を含む側を動く板として決定
        const boards = selectMovingBoard(
          separated.leftBoard,
          separated.rightBoard,
          originalPoint,
          foldLineSegment
        );
        if (!boards) return;

        // 折り線情報を状態に保存
        setFoldLineState({
          midpoint: foldLine.midpoint,
          direction: foldLine.direction,
          start: intersections.start,
          end: intersections.end,
        });

        // 折り線を可視化
        visualizeFoldLine(scene, intersections.start, intersections.end);

        // 折り紙を分割された2枚の板に差し替え
        replaceOrigamiWithBoards({
          scene,
          boards,
          pivotPoint: intersections.start,
          origamiColor,
        });

        setFoldBoards(boards);
        setFoldPhase("folding");
      } catch (error) {
        console.error("Invalid fold line:", error);
      }
    };

    const handleMouseUp = () => {
      if (!draggedPoint || !originalPoint) return;

      const draggedPointMesh = scene.getObjectByName("draggedPoint");
      if (!draggedPointMesh) return; // ドラッグ終了点が存在しない場合は基本的に起こり得ない。アプリケーションを終了させるべきでもないので、エラーとして処理しない。

      // ドラッグ終了位置を取得
      const droppedPoint = draggedPointMesh.position.clone();

      tryFold(droppedPoint);

      // 折りの成否に関わらずドラッグ中の点をクリアして状態をリセット
      scene.remove(draggedPointMesh);
      disposeObject3D(draggedPointMesh);
      setDraggedPoint(null);
      setIsDragging(false);
      setOriginalPoint(null);

      // シーンを再描画
      renderer.render(scene, camera);
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
    size,
    origamiColor,
    setFoldLineState,
    foldPhase,
    setFoldPhase,
    setFoldBoards,
  ]);
};

/**
 * 折り紙（板とスナップポイント）を分割された2枚の板に差し替える
 *
 * @param props.scene - Three.jsのシーン
 * @param props.boards - 分割された動く板と固定される板
 * @param props.pivotPoint - 回転の基準点（折り線上の点）
 * @param props.origamiColor - 板の色
 *
 * @description
 * - 既存の折り紙とスナップポイントを削除（リソースも破棄）
 * - 固定される板は "board_static" としてシーンに直接追加
 * - 動く板は "board_moving" としてピボットGroup（"board_moving_pivot"）に入れる
 *   - Groupのpositionを折り線上の点に置き、板メッシュを逆オフセットすることで
 *     ワールド座標を維持したまま、Groupの回転＝折り線周りの回転になる
 * - 動く板はpolygonOffsetを有効にして、折り重なった際のz-fightingを防ぐ
 */
const replaceOrigamiWithBoards = (props: {
  scene: THREE.Scene;
  boards: MovingAndStaticBoards;
  pivotPoint: THREE.Vector3;
  origamiColor: string;
}): void => {
  const { scene, boards, pivotPoint, origamiColor } = props;

  // 既存の折り紙とスナップポイントを削除
  const obsoleteObjects = scene.children.filter(
    (child) =>
      child.name === "origami" || child.name.startsWith("snapPoint_")
  );
  obsoleteObjects.forEach((obj) => {
    scene.remove(obj);
    disposeObject3D(obj);
  });

  // 固定される板
  const staticBoardMesh = createBoardMesh(boards.staticBoard, origamiColor, {
    name: "board_static",
  });
  scene.add(staticBoardMesh);

  // 動く板（ピボットGroupに入れて折り線周りに回転できるようにする）
  const movingBoardMesh = createBoardMesh(boards.movingBoard, origamiColor, {
    name: "board_moving",
    enablePolygonOffset: true,
  });
  const pivotGroup = new THREE.Group();
  pivotGroup.name = "board_moving_pivot";
  pivotGroup.position.copy(pivotPoint);
  movingBoardMesh.position.copy(pivotPoint.clone().negate());
  pivotGroup.add(movingBoardMesh);
  scene.add(pivotGroup);
};

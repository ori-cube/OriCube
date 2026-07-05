import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { FoldPhase, FoldProposal, PendingFold } from "../../index";
import { LayeredBoard } from "../../types";
import { calculateFoldLine } from "../../utils/calculateFoldLine";
import { calculateFoldLineSpan } from "../../utils/calculateFoldLineSpan";
import { visualizeFoldLine } from "../../utils/visualizeFoldLine";
import { disposeObject3D } from "../../utils/disposeObject3D";
import { applyFoldStep, findFoldCandidates } from "../../utils/applyFoldStep";
import { commenceFold } from "./commenceFold";

type UseDropHandler = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  currentBoards: LayeredBoard[];
  draggedPoint: Point | null;
  setDraggedPoint: (point: Point | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  originalPoint: THREE.Vector3 | null;
  setOriginalPoint: (point: THREE.Vector3 | null) => void;
  origamiColor: string;
  foldPhase: FoldPhase;
  setFoldPhase: (phase: FoldPhase) => void;
  setFoldProposal: (proposal: FoldProposal | null) => void;
  setPendingFold: (pending: PendingFold | null) => void;
}) => void;

/**
 * マウスドロップ処理を管理するカスタムフック
 *
 * @description
 * - マウスアップ時に折り線を計算し、ドラッグした頂点を持つ板の数で分岐する:
 *   - 候補が1枚: その板を折る対象としてシーンを差し替え、foldingフェーズへ
 *   - 候補が複数枚（折りで頂点が重なっている場合）: 折り線をプレビュー表示し、
 *     折る枚数を選択するselectingフェーズへ（確定はuseDragDropのconfirmFold）
 * - 折りが成立しない場合（折り線が板を横切らない等）: 何もせずidleのまま
 *   再ドラッグを待つ
 * - 折りの成否に関わらずドラッグ中の点はクリアする
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.currentBoards - 現在の板群（分割の入力に使用）
 * @param props.draggedPoint - 現在ドラッグ中の点
 * @param props.setDraggedPoint - ドラッグ中の点を設定する関数
 * @param props.origamiColor - 折り紙の色（分割後の板の描画に使用）
 * @param props.foldPhase - 折り操作のフェーズ（idle以外では処理しない）
 * @param props.setFoldPhase - フェーズを遷移させる関数
 * @param props.setFoldProposal - 枚数選択待ちの折り操作を設定する関数
 * @param props.setPendingFold - アニメーション待ちの折り操作を設定する関数
 */
export const useDropHandler: UseDropHandler = ({
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
  setFoldProposal,
  setPendingFold,
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
     * 折る枚数として選択できる（折りが成立する）枚数の一覧を返す
     */
    const collectValidCounts = (
      midpoint: THREE.Vector3,
      direction: THREE.Vector3,
      dragVertex: THREE.Vector3,
      candidates: LayeredBoard[]
    ): number[] => {
      const validCounts: number[] = [];

      for (let count = 1; count <= candidates.length; count++) {
        const span = calculateFoldLineSpan(
          midpoint,
          direction,
          candidates.slice(0, count).map((candidate) => candidate.polygon)
        );
        if (!span) continue;

        const isValid =
          applyFoldStep(currentBoards, {
            foldLine: span,
            dragVertex,
            foldCount: count,
            viewFront: true,
          }) !== null;
        if (isValid) validCounts.push(count);
      }

      return validCounts;
    };

    /**
     * 折り線を計算し、成立する場合はfolding（候補が複数ならselecting）へ遷移する
     */
    const tryFold = (droppedPoint: THREE.Vector3) => {
      if (!originalPoint) return;

      // 折り線を計算（同一点の場合はnull。再ドラッグを待つ）
      const foldLineInfo = calculateFoldLine(originalPoint, droppedPoint);
      if (!foldLineInfo) return;

      const dragVertex = new THREE.Vector3(
        originalPoint.x,
        originalPoint.y,
        0
      );
      const candidates = findFoldCandidates(currentBoards, dragVertex, true);
      if (candidates.length === 0) return;

      // 複数の板が頂点を共有している場合は、折る枚数の選択へ
      if (candidates.length > 1) {
        const validCounts = collectValidCounts(
          foldLineInfo.midpoint,
          foldLineInfo.direction,
          dragVertex,
          candidates
        );
        if (validCounts.length === 0) return;

        // 全候補を覆うスパンで折り線をプレビュー表示
        const previewSpan = calculateFoldLineSpan(
          foldLineInfo.midpoint,
          foldLineInfo.direction,
          candidates.map((candidate) => candidate.polygon)
        );
        if (!previewSpan) return;
        visualizeFoldLine(scene, previewSpan.start, previewSpan.end);

        setFoldProposal({
          midpoint: foldLineInfo.midpoint,
          direction: foldLineInfo.direction,
          dragVertex,
          validCounts,
          maxFoldCount: candidates.length,
        });
        setFoldPhase("selecting");
        return;
      }

      // 候補が1枚の場合はそのまま折りを確定する
      const pending = commenceFold({
        scene,
        currentBoards,
        midpoint: foldLineInfo.midpoint,
        direction: foldLineInfo.direction,
        dragVertex,
        foldCount: 1,
        origamiColor,
      });
      if (!pending) return;

      setPendingFold(pending);
      setFoldPhase("folding");
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
    currentBoards,
    draggedPoint,
    setDraggedPoint,
    setIsDragging,
    originalPoint,
    setOriginalPoint,
    origamiColor,
    foldPhase,
    setFoldPhase,
    setFoldProposal,
    setPendingFold,
  ]);
};

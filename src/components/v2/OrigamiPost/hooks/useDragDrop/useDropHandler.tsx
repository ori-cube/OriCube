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
import {
  applySquashFoldStep,
  buildSquashFoldStep,
} from "../../utils/applySquashFoldStep";
import { commenceFold } from "./commenceFold";
import { commenceSquashFold } from "./commenceSquashFold";

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
 * - マウスアップ時に折り線を計算し、成立する操作（折れる枚数と開いて畳む）
 *   の数で分岐する:
 *   - 成立する操作が1通り（枚数が1通りで開いて畳むが不成立、または
 *     開いて畳むだけが成立する場合）: 選択させずにその操作でシーンを
 *     差し替え、foldingフェーズへ
 *   - 成立する操作が複数通り: 折り線をプレビュー表示し、操作を選択する
 *     selectingフェーズへ（確定はuseDragDropのconfirmFold）
 * - どの操作も成立しない場合（折り線が板を横切らない、紙が破れる等）:
 *   何もせずidleのまま再ドラッグを待つ
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
      candidates: LayeredBoard[],
      viewFront: boolean
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
            kind: "fold",
            foldLine: span,
            dragVertex,
            foldCount: count,
            viewFront,
          }) !== null;
        if (isValid) validCounts.push(count);
      }

      return validCounts;
    };

    /**
     * 折り線を計算し、成立する場合はfolding（選べる枚数が複数ならselecting）へ
     * 遷移する
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

      // どちら側から見て折っているかは、ドロップ時のカメラ位置で判定する
      const viewFront = camera.position.z > 0;

      const candidates = findFoldCandidates(
        currentBoards,
        dragVertex,
        viewFront
      );
      if (candidates.length === 0) return;

      const validCounts = collectValidCounts(
        foldLineInfo.midpoint,
        foldLineInfo.direction,
        dragVertex,
        candidates,
        viewFront
      );

      // 開いて畳むが成立するかを判定する
      const squashStep = buildSquashFoldStep({
        boards: currentBoards,
        midpoint: foldLineInfo.midpoint,
        direction: foldLineInfo.direction,
        dragVertex,
        viewFront,
      });
      const squashAvailable =
        squashStep !== null &&
        applySquashFoldStep(currentBoards, squashStep) !== null;

      if (validCounts.length === 0 && !squashAvailable) return;

      // 開いて畳むだけが成立する場合は選択させず、そのまま開いて畳む
      if (validCounts.length === 0) {
        const pending = commenceSquashFold({
          scene,
          currentBoards,
          midpoint: foldLineInfo.midpoint,
          direction: foldLineInfo.direction,
          dragVertex,
          viewFront,
          origamiColor,
        });
        if (!pending) return;

        setPendingFold(pending);
        setFoldPhase("folding");
        return;
      }

      // 折れる枚数が1通りで開いて畳むも不成立なら選択させず、そのまま折る
      if (validCounts.length === 1 && !squashAvailable) {
        const pending = commenceFold({
          scene,
          currentBoards,
          midpoint: foldLineInfo.midpoint,
          direction: foldLineInfo.direction,
          dragVertex,
          foldCount: validCounts[0],
          viewFront,
          origamiColor,
        });
        if (!pending) return;

        setPendingFold(pending);
        setFoldPhase("folding");
        return;
      }

      // 複数の選択肢（枚数や開いて畳む）から選べる場合のみ、選択へ。
      // 全候補を覆うスパンで折り線をプレビュー表示する
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
        squashAvailable,
        viewFront,
      });
      setFoldPhase("selecting");
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

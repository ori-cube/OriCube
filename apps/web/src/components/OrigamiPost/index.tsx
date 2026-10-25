"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  useInitScene,
  useDragDrop,
  useFoldAnimation,
  useFlipView,
  useViewMode,
  useCameraFocus,
} from "./hooks";
import {
  EditorStep,
  FoldStep,
  InsideReverseFoldStep,
  LayeredBoard,
  PetalFoldStep,
  SquashFoldStep,
  SquashFoldStepResult,
  PetalFoldStepResult,
  createSquareBoard,
  replayFoldStepsDetailed,
  FoldHistory,
  EMPTY_FOLD_HISTORY,
  appliedFoldSteps,
  pushFoldStep,
  undoFoldStep,
  redoFoldStep,
  canUndo,
  canRedo,
  isFoldStep,
  serializeOrigamiState,
  SerializedOrigamiState,
} from "@oricube/engine";
import { FoldCountSelector } from "./FoldCountSelector";
import { Toolbar } from "./Toolbar";
import styles from "./index.module.css";

/**
 * 折り操作のフェーズ
 *
 * - idle: 折り線の入力待ち（ドラッグ&ドロップ可能）
 * - selecting: 折る枚数の選択待ち（ドラッグ&ドロップ不可）
 * - folding: 折りアニメーション中（ドラッグ&ドロップ不可）
 * - viewing: ビューモード（確認用の回転視点。ドラッグ&ドロップ不可）
 */
export type FoldPhase = "idle" | "selecting" | "folding" | "viewing";

declare global {
  interface Window {
    /** 現在の折り状態をJSONでコンソールに出力する（デバッグ・状況共有用） */
    dumpOrigami?: () => SerializedOrigamiState;
  }
}

/**
 * 折る枚数の選択を待っている折り操作
 */
export interface FoldProposal {
  /** 折り線が通る中点 */
  midpoint: THREE.Vector3;
  /** 折り線の方向ベクトル */
  direction: THREE.Vector3;
  /** ドラッグした頂点の元位置 */
  dragVertex: THREE.Vector3;
  /** 選択できる（折りが成立する）枚数の一覧 */
  validCounts: number[];
  /** 折る枚数の上限（頂点を共有する板の数） */
  maxFoldCount: number;
  /** 開いて畳むが選択できるか */
  squashAvailable: boolean;
  /** 花弁折りが選択できるか */
  petalAvailable: boolean;
  /** 中割り折りが選択できるか */
  insideReverseAvailable: boolean;
  /** ドロップ時に表側（+Z側）から見ていたか */
  viewFront: boolean;
}

/**
 * アニメーション完了を待っている折り操作
 */
export type PendingFold =
  | {
      kind: "fold";
      /** 適用する折り操作（アニメーション完了時に履歴へ積む） */
      step: FoldStep;
      /** 回転前の動く片（回転軸の決定に使用） */
      movingBoards: LayeredBoard[];
    }
  | {
      kind: "squash";
      /** 適用する開いて畳む操作（アニメーション完了時に履歴へ積む） */
      step: SquashFoldStep;
      /** 適用結果（動く片と回転軸の決定に使用） */
      result: SquashFoldStepResult;
    }
  | {
      kind: "petal";
      /** 適用する花弁折り操作（アニメーション完了時に履歴へ積む） */
      step: PetalFoldStep;
      /** 適用結果（動く片と回転軸の決定に使用） */
      result: PetalFoldStepResult;
    }
  | {
      kind: "insideReverse";
      /** 適用する中割り折り操作（アニメーション完了時に履歴へ積む） */
      step: InsideReverseFoldStep;
      /** 回転前の動く先端片（回転軸の決定に使用） */
      movingBoards: LayeredBoard[];
    };

export interface OrigamiEditorState {
  /** 適用済みの折り操作と裏返し */
  steps: EditorStep[];
  color: string;
  busy: boolean;
  viewFront: boolean;
  /** 折り操作のフェーズ（画面の案内文の切り替えに使う） */
  phase: FoldPhase;
}

export interface OrigamiPostV2Props {
  initialSteps?: EditorStep[];
  autoResize?: boolean;
  onStateChange?: (state: OrigamiEditorState) => void;
  /** 折り紙の表面の色（裏面はBOARD_BACK_COLORの固定色）。色の選択は呼び出し側が置く */
  color?: string;
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
 * - 折り紙の頂点をドラッグ&ドロップして繰り返し折ることができる
 * - 折り手順の履歴（FoldStep列）が唯一の状態源で、現在の板の形状は
 *   リプレイ（replayFoldSteps）で導出する
 * - カメラの回転・ズーム機能
 *
 * @param props.color - 折り紙の表面の色（デフォルト: "#4A90E2"）
 * @param props.size - 折り紙のサイズ（デフォルト: 100）
 * @param props.cameraPosition - カメラの初期位置（デフォルト: {x: 0, y: 0, z: 150}）
 * @param props.width - カンバスの幅（デフォルト: window.innerWidth - 320）
 * @param props.height - カンバスの高さ（デフォルト: window.innerHeight）
 */
export function OrigamiPostV2({
  initialSteps = [],
  autoResize = true,
  onStateChange,
  color: origamiColor = "#4A90E2",
  size = 100,
  cameraPosition = { x: 0, y: 0, z: 150 },
  width = window.innerWidth - 320,
  height = window.innerHeight,
}: OrigamiPostV2Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);

  // 折り操作のフェーズ（idle以外ではドラッグ&ドロップを無効化）
  const [foldPhase, setFoldPhase] = useState<FoldPhase>("idle");

  // 折り手順の履歴（唯一の状態源。Undo/Redoは適用済みステップ数の操作）
  const [foldHistory, setFoldHistory] =
    useState<FoldHistory>(() => initialSteps.length ? { steps: initialSteps, index: initialSteps.length } : EMPTY_FOLD_HISTORY);

  // 折る枚数の選択を待っている折り操作
  const [foldProposal, setFoldProposal] = useState<FoldProposal | null>(null);

  // アニメーション完了を待っている折り操作
  const [pendingFold, setPendingFold] = useState<PendingFold | null>(null);

  // ドラッグ開始時の元の位置
  const [originalPoint, setOriginalPoint] = useState<THREE.Vector3 | null>(
    null
  );

  const currentSteps = useMemo(() => appliedFoldSteps(foldHistory), [foldHistory]);

  // 現在の板群（適用済みの折り手順のリプレイで導出する）
  const initialBoard = useMemo(() => createSquareBoard(size), [size]);
  const replayResult = useMemo(
    () => replayFoldStepsDetailed(initialBoard, currentSteps),
    [initialBoard, currentSteps]
  );
  const currentBoards = replayResult.boards;
  const finishingRotations = replayResult.finishingRotations;

  // 現在の状態をコンソールから取り出せるようにする（dumpOrigami() / copy(dumpOrigami())）
  useEffect(() => {
    window.dumpOrigami = () => {
      const state = serializeOrigamiState(
        currentBoards,
        appliedFoldSteps(foldHistory).filter(isFoldStep)
      );
      console.log(JSON.stringify(state, null, 2));
      return state;
    };
    return () => {
      delete window.dumpOrigami;
    };
  }, [currentBoards, foldHistory]);

  // 折りアニメーション完了時: 折り操作を履歴へ確定し、次の折りの入力待ちへ戻る
  const completeFold = useCallback(() => {
    if (!pendingFold) return;
    setFoldHistory((prev) => pushFoldStep(prev, pendingFold.step));
    setPendingFold(null);
    setFoldPhase("idle");
  }, [pendingFold]);


  // シーンの初期化
  const requestRender = useInitScene({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    raycasterRef,
    width,
    height,
    cameraPosition,
    autoResize,
  });

  // 折り紙の中心への視点追従（回転の中心を紙の中心に保つ）
  useCameraFocus({
    cameraRef,
    controlsRef,
    currentBoards,
  });

  // ドラッグ&ドロップ機能（板の描画とスナップポイントの管理を含む）
  const { confirmFold, cancelFold } = useDragDrop({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    origamiColor,
    currentBoards,
    finishingRotations,
    originalPoint,
    setOriginalPoint,
    foldPhase,
    setFoldPhase,
    foldProposal,
    setFoldProposal,
    setPendingFold,
  });

  // 折り線を軸とした180度折りアニメーション
  useFoldAnimation({
    sceneRef,
    controlsRef,
    foldPhase,
    pendingFold,
    completeFold,
    requestRender,
  });

  // 折り紙を裏返す視点回転
  const { flipView, isFlipping } = useFlipView({ cameraRef, controlsRef, requestRender });
  const isFlippingRef = useRef(isFlipping);
  isFlippingRef.current = isFlipping;

  // Undo / Redo（折りの入力待ち中のみ受け付ける）
  // 裏返しを戻す・やり直すときは、視点も一緒に裏返す
  const handleUndo = useCallback(() => {
    if (foldPhase !== "idle" || isFlippingRef.current || !canUndo(foldHistory)) return;
    if (foldHistory.steps[foldHistory.index - 1].kind === "flip") flipView();
    setFoldHistory(undoFoldStep);
  }, [foldPhase, foldHistory, flipView]);

  const handleRedo = useCallback(() => {
    if (foldPhase !== "idle" || isFlippingRef.current || !canRedo(foldHistory)) return;
    if (foldHistory.steps[foldHistory.index].kind === "flip") flipView();
    setFoldHistory(redoFoldStep);
  }, [foldPhase, foldHistory, flipView]);

  // 裏返しは閲覧時にも手順として再生するため、履歴に積む
  const handleFlip = useCallback(() => {
    if (foldPhase !== "idle" || isFlippingRef.current) return;
    const viewFront = (cameraRef.current?.position.z ?? 1) >= 0;
    flipView();
    setFoldHistory((prev) => pushFoldStep(prev, { kind: "flip", viewFront: !viewFront }));
  }, [foldPhase, flipView]);

  // Ctrl+Z（⌘Z）で元に戻し、Ctrl+Shift+Z（⌘⇧Z）・Ctrl+Yでやり直す。
  // 文字入力中は入力欄の取り消しを優先する
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      const redo = key === "y" || (key === "z" && event.shiftKey);
      if (key !== "z" && !redo) return;
      event.preventDefault();
      if (isFlippingRef.current) return;
      if (redo) handleRedo();
      else handleUndo();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ビューモード（確認用の回転視点）
  const { toggleViewMode } = useViewMode({
    cameraRef,
    controlsRef,
    foldPhase,
    setFoldPhase,
  });

  useEffect(() => {
    onStateChange?.({ steps: currentSteps, color: origamiColor, busy: foldPhase !== "idle" || isFlipping, viewFront: (cameraRef.current?.position.z ?? 1) >= 0, phase: foldPhase });
  }, [onStateChange, currentSteps, origamiColor, foldPhase, isFlipping]);

  return (
    <div className={styles.container} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        id="origami-canvas"
        className={styles.canvas}
        style={{ width, height }}
        role="img"
        aria-label="折り紙。頂点をドラッグして折ります"
      />
      <Toolbar
        canUndo={foldPhase === "idle" && !isFlipping && canUndo(foldHistory)}
        canRedo={foldPhase === "idle" && !isFlipping && canRedo(foldHistory)}
        canFlip={foldPhase === "idle" && !isFlipping}
        canToggleViewMode={
          (foldPhase === "idle" || foldPhase === "viewing") && !isFlipping
        }
        isViewing={foldPhase === "viewing"}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFlip={handleFlip}
        onToggleViewMode={toggleViewMode}
      >
        {foldPhase === "selecting" && foldProposal ? (
          <FoldCountSelector
            maxFoldCount={foldProposal.maxFoldCount}
            validCounts={foldProposal.validCounts}
            squashAvailable={foldProposal.squashAvailable}
            petalAvailable={foldProposal.petalAvailable}
            insideReverseAvailable={foldProposal.insideReverseAvailable}
            onConfirm={confirmFold}
            onCancel={cancelFold}
          />
        ) : null}
      </Toolbar>
    </div>
  );
}

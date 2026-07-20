"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import {
  useInitScene,
  useDragDrop,
  useFoldAnimation,
  useFlipView,
  useViewMode,
} from "./hooks";
import {
  FoldStep,
  InsideReverseFoldStep,
  LayeredBoard,
  PetalFoldStep,
  SquashFoldStep,
} from "./types";
import { SquashFoldStepResult } from "./utils/applySquashFoldStep";
import { PetalFoldStepResult } from "./utils/applyPetalFoldStep";
import { createSquareBoard } from "./utils/createSquareBoard";
import { replayFoldStepsDetailed } from "./utils/replayFoldSteps";
import {
  FoldHistory,
  EMPTY_FOLD_HISTORY,
  appliedFoldSteps,
  pushFoldStep,
  undoFoldStep,
  redoFoldStep,
  canUndo,
  canRedo,
} from "./utils/foldHistory";
import {
  serializeOrigamiState,
  SerializedOrigamiState,
} from "./utils/serializeOrigamiState";
import { FoldCountSelector } from "./FoldCountSelector";
import { Toolbar } from "./Toolbar";
import styles from "./index.module.scss";

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

export interface OrigamiPostV2Props {
  /** 折り紙の色 */
  origamiColor?: string;
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
 * @param props.origamiColor - 折り紙の色（デフォルト: "#4A90E2"）
 * @param props.size - 折り紙のサイズ（デフォルト: 100）
 * @param props.cameraPosition - カメラの初期位置（デフォルト: {x: 0, y: 0, z: 150}）
 * @param props.width - カンバスの幅（デフォルト: window.innerWidth - 320）
 * @param props.height - カンバスの高さ（デフォルト: window.innerHeight）
 */
export const OrigamiPostV2: React.FC<OrigamiPostV2Props> = ({
  origamiColor = "#4A90E2",
  size = 100,
  cameraPosition = { x: 0, y: 0, z: 150 },
  width = window.innerWidth - 320,
  height = window.innerHeight,
}) => {
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
    useState<FoldHistory>(EMPTY_FOLD_HISTORY);

  // 折る枚数の選択を待っている折り操作
  const [foldProposal, setFoldProposal] = useState<FoldProposal | null>(null);

  // アニメーション完了を待っている折り操作
  const [pendingFold, setPendingFold] = useState<PendingFold | null>(null);

  // ドラッグ開始時の元の位置
  const [originalPoint, setOriginalPoint] = useState<THREE.Vector3 | null>(
    null
  );

  // 現在の板群（適用済みの折り手順のリプレイで導出する）
  const initialBoard = useMemo(() => createSquareBoard(size), [size]);
  const replayResult = useMemo(
    () => replayFoldStepsDetailed(initialBoard, appliedFoldSteps(foldHistory)),
    [initialBoard, foldHistory]
  );
  const currentBoards = replayResult.boards;
  const finishingRotations = replayResult.finishingRotations;

  // 現在の状態をコンソールから取り出せるようにする（dumpOrigami() / copy(dumpOrigami())）
  useEffect(() => {
    window.dumpOrigami = () => {
      const state = serializeOrigamiState(
        currentBoards,
        appliedFoldSteps(foldHistory)
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

  // Undo / Redo（折りの入力待ち中のみ受け付ける）
  const handleUndo = useCallback(() => {
    if (foldPhase !== "idle") return;
    setFoldHistory(undoFoldStep);
  }, [foldPhase]);

  const handleRedo = useCallback(() => {
    if (foldPhase !== "idle") return;
    setFoldHistory(redoFoldStep);
  }, [foldPhase]);

  // シーンの初期化
  useInitScene({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    raycasterRef,
    width,
    height,
    cameraPosition,
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
  });

  // 折り紙を裏返す視点回転
  const { flipView, isFlipping } = useFlipView({ cameraRef, controlsRef });

  // ビューモード（確認用の回転視点）
  const { toggleViewMode } = useViewMode({
    cameraRef,
    controlsRef,
    foldPhase,
    setFoldPhase,
  });

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        id="origami-canvas"
        className={styles.canvas}
        style={{ width, height }}
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
        onFlip={flipView}
        onToggleViewMode={toggleViewMode}
      />
      {foldPhase === "selecting" && foldProposal && (
        <FoldCountSelector
          maxFoldCount={foldProposal.maxFoldCount}
          validCounts={foldProposal.validCounts}
          squashAvailable={foldProposal.squashAvailable}
          petalAvailable={foldProposal.petalAvailable}
          insideReverseAvailable={foldProposal.insideReverseAvailable}
          onConfirm={confirmFold}
          onCancel={cancelFold}
        />
      )}
    </div>
  );
};

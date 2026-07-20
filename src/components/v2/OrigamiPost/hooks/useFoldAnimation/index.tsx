import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { FoldPhase, PendingFold } from "../../index";
import { determineFoldRotation } from "../../utils/determineFoldRotation";
import { removeFoldLine } from "../../utils/visualizeFoldLine";
import { easeInOutCubic } from "../../utils/easeInOutCubic";
import {
  computeSquashAnimationPositions,
  deriveSquashRotationAxes,
} from "../../utils/computeSquashAnimationPositions";
import {
  computePetalAnimationPositions,
  derivePetalRotationAxes,
} from "../../utils/computePetalAnimationPositions";
import { updateMorphBoardMeshPositions } from "../../utils/createMorphBoardMesh";

/** 折りアニメーションの所要時間（ミリ秒） */
const FOLD_DURATION_MS = 800;

type UseFoldAnimation = (props: {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  controlsRef: React.MutableRefObject<OrbitControls | null>;
  foldPhase: FoldPhase;
  pendingFold: PendingFold | null;
  completeFold: () => void;
}) => void;

/**
 * 折り線を軸とした180度折りアニメーションを管理するカスタムフック
 *
 * @description
 * - foldPhaseがfoldingに遷移したらアニメーションを開始する
 * - requestAnimationFrameで回転角を0→180度に進める（easeInOutCubic、
 *   描画はuseInitSceneのアニメーションループが毎フレーム行う）
 * - 回転のさせ方は折り操作の種類で異なる:
 *   - 通常の折り: ピボットGroup（board_moving_pivot）を折り線周りに回転
 *   - 開いて畳む: モーフ板（board_squash_moving_*）の頂点座標を、頂点ごとの
 *     回転軸（折り線・ヒンジ・その合成）で毎フレーム書き換える
 *   - 花弁折り: モーフ板（board_petal_moving_*）の頂点座標を、頂点ごとの
 *     回転軸（折り線・かぶせ折り線・その合成）で毎フレーム書き換える
 * - 回転軸の向きはdetermineFoldRotationで決定し、動く片は常に折ったときの
 *   視点側（表なら+Z）を通って折り返される
 * - アニメーション中はOrbitControlsを無効化する
 * - 完了時の処理:
 *   - 折り線シリンダー（ヒンジ線を含む）を削除
 *   - completeFoldを呼び、折り操作を履歴へ確定する
 *     （折り後の板の描画は、履歴のリプレイ結果を使うuseRenderBoardsが行う）
 *
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.controlsRef - OrbitControlsのref
 * @param props.foldPhase - 折り操作のフェーズ
 * @param props.pendingFold - アニメーション完了を待っている折り操作
 * @param props.completeFold - 折り操作を履歴へ確定してidleへ戻す関数
 */
export const useFoldAnimation: UseFoldAnimation = ({
  sceneRef,
  controlsRef,
  foldPhase,
  pendingFold,
  completeFold,
}) => {
  useEffect(() => {
    if (foldPhase !== "folding") return;
    if (!pendingFold) return;

    const scene = sceneRef.current;
    if (!scene) return;

    const applyAngle = createAngleApplier(scene, pendingFold);

    // 回転を構成できない場合は回転せずに折りを確定する（通常は起こり得ない。
    // 確定後の描画は履歴のリプレイ結果を使うため最終状態は正しい）
    if (!applyAngle) {
      removeFoldLine(scene);
      completeFold();
      return;
    }

    const controls = controlsRef.current;
    if (controls) controls.enabled = false;

    const finishFold = () => {
      // 役目を終えた折り線シリンダー（ヒンジ線を含む）を削除
      removeFoldLine(scene);

      if (controls) controls.enabled = true;
      completeFold();
    };

    let animationFrameId = 0;
    let startTime: number | null = null;

    // 仕上げ角度（180度未満の折り）はその角度で回転を止める
    const targetAngle =
      pendingFold.kind === "fold"
        ? (pendingFold.step.angle ?? Math.PI)
        : Math.PI;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / FOLD_DURATION_MS, 1);
      const angle = easeInOutCubic(progress) * targetAngle;
      applyAngle(angle);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        finishFold();
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (controls) controls.enabled = true;
    };
  }, [sceneRef, controlsRef, foldPhase, pendingFold, completeFold]);
};

/**
 * 折り操作の種類に応じた回転適用関数を作成する
 */
const createAngleApplier = (
  scene: THREE.Scene,
  pendingFold: PendingFold
): ((angle: number) => void) | null => {
  switch (pendingFold.kind) {
    case "fold":
    case "insideReverse":
      return createFoldAngleApplier(scene, pendingFold);
    case "squash":
      return createSquashAngleApplier(scene, pendingFold);
    case "petal":
      return createPetalAngleApplier(scene, pendingFold);
  }
};

/**
 * 通常の折り・中割り折りの回転適用関数を作成する
 *
 * @returns 回転角を受け取ってピボットGroupを回転させる関数。
 *          構成できない場合はnull
 *
 * @description
 * どちらの操作も全ての動く片が折り線周りの同一回転を受けるため、
 * 単一のピボットGroupの回転で表現できる（中割り折りの差し込みレイヤーは
 * 確定後のリプレイ再描画で反映される）
 */
const createFoldAngleApplier = (
  scene: THREE.Scene,
  pendingFold: Extract<PendingFold, { kind: "fold" | "insideReverse" }>
): ((angle: number) => void) | null => {
  const pivotGroup = scene.getObjectByName("board_moving_pivot");
  if (!pivotGroup) return null;

  // 全ての動く片は折り線の同じ側にあるため、頂点をまとめて回転の向きを決める
  const movingVertices = pendingFold.movingBoards.flatMap(
    (board) => board.polygon
  );
  // 動く片は折ったときの視点側（表なら+Z、裏なら-Z）へ持ち上げる
  const liftDirection = new THREE.Vector3(
    0,
    0,
    pendingFold.step.viewFront ? 1 : -1
  );
  const axis = determineFoldRotation(
    pendingFold.step.foldLine,
    movingVertices,
    liftDirection
  );
  if (!axis) return null;

  return (angle: number) => {
    pivotGroup.setRotationFromAxisAngle(axis, angle);
  };
};

/**
 * 開いて畳むの回転適用関数を作成する
 *
 * @returns 回転角を受け取ってモーフ板の頂点座標を書き換える関数。
 *          構成できない場合はnull
 */
const createSquashAngleApplier = (
  scene: THREE.Scene,
  pendingFold: Extract<PendingFold, { kind: "squash" }>
): ((angle: number) => void) | null => {
  const { step, result } = pendingFold;

  const morphGroups: THREE.Object3D[] = [];
  for (let i = 0; i < result.movingPieces.length; i++) {
    const group = scene.getObjectByName(`board_squash_moving_${i}`);
    if (!group) return null;
    morphGroups.push(group);
  }

  const axes = deriveSquashRotationAxes(step, result);
  if (!axes) return null;

  const spine = { start: result.spineApex, end: step.dragVertex };

  return (angle: number) => {
    const positions = computeSquashAnimationPositions({
      movingPieces: result.movingPieces,
      foldLine: step.foldLine,
      hinge: result.hinge,
      spine,
      foldLineAxis: axes.foldLineAxis,
      hingeAxis: axes.hingeAxis,
      angle,
    });
    positions.forEach((piecePositions, index) => {
      updateMorphBoardMeshPositions(morphGroups[index], piecePositions);
    });
  };
};

/**
 * 花弁折りの回転適用関数を作成する
 *
 * @returns 回転角を受け取ってモーフ板の頂点座標を書き換える関数。
 *          構成できない場合はnull
 */
const createPetalAngleApplier = (
  scene: THREE.Scene,
  pendingFold: Extract<PendingFold, { kind: "petal" }>
): ((angle: number) => void) | null => {
  const { step, result } = pendingFold;

  const morphGroups: THREE.Object3D[] = [];
  for (let i = 0; i < result.movingPieces.length; i++) {
    const group = scene.getObjectByName(`board_petal_moving_${i}`);
    if (!group) return null;
    morphGroups.push(group);
  }

  const axes = derivePetalRotationAxes(step, result);
  if (!axes) return null;

  return (angle: number) => {
    const positions = computePetalAnimationPositions({
      movingPieces: result.movingPieces,
      foldLine: result.foldLine,
      kiteLines: result.kiteLines,
      tuckCreases: result.tuckCreases,
      foldLineAxis: axes.foldLineAxis,
      kiteAxes: axes.kiteAxes,
      angle,
    });
    positions.forEach((piecePositions, index) => {
      updateMorphBoardMeshPositions(morphGroups[index], piecePositions);
    });
  };
};

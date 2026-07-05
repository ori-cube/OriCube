import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { FoldPhase, PendingFold } from "../../index";
import { determineFoldRotation } from "../../utils/determineFoldRotation";
import { disposeObject3D } from "../../utils/disposeObject3D";

/** 折りアニメーションの所要時間（ミリ秒） */
const FOLD_DURATION_MS = 800;

/**
 * アニメーションの進行度（0〜1）を「ゆっくり始まり、中盤で加速し、
 * ゆっくり終わる」曲線に変換するイージング関数
 *
 * @description
 * 経過時間をそのまま回転角に使うと等速で機械的な動きになるため、
 * 紙を折る手の動きに近い緩急をつける。3次曲線を前半・後半で
 * つないだ標準的なease-in-out（https://easings.net/#easeInOutCubic）
 */
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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
 * - ピボットGroup（board_moving_pivot）をrequestAnimationFrameで
 *   0→180度回転させる（easeInOutCubic、描画はuseInitSceneの
 *   アニメーションループが毎フレーム行う）
 * - 回転軸の向きはdetermineFoldRotationで決定し、動く片は常に+Z側
 *   （カメラ側）を通って折り返される
 * - アニメーション中はOrbitControlsを無効化する
 * - 完了時の処理:
 *   - 折り線シリンダーを削除
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

    const pivotGroup = scene.getObjectByName("board_moving_pivot");
    if (!pivotGroup) return;

    // 全ての動く片は折り線の同じ側にあるため、頂点をまとめて回転の向きを決める
    const movingVertices = pendingFold.movingBoards.flatMap(
      (board) => board.polygon
    );
    const axis = determineFoldRotation(pendingFold.step.foldLine, movingVertices);

    // 軸を決定できない場合は回転せずに折りを確定する（通常は起こり得ない）
    if (!axis) {
      completeFold();
      return;
    }

    const controls = controlsRef.current;
    if (controls) controls.enabled = false;

    const finishFold = () => {
      // 役目を終えた折り線シリンダーを削除
      const foldLineObject = scene.getObjectByName("foldLine");
      if (foldLineObject) {
        scene.remove(foldLineObject);
        disposeObject3D(foldLineObject);
      }

      if (controls) controls.enabled = true;
      completeFold();
    };

    let animationFrameId = 0;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / FOLD_DURATION_MS, 1);
      const angle = easeInOutCubic(progress) * Math.PI;
      pivotGroup.setRotationFromAxisAngle(axis, angle);

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

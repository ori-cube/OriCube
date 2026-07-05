import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { FoldLineState, FoldPhase } from "../../index";
import { MovingAndStaticBoards } from "../../utils/selectMovingBoard";
import { determineFoldRotation } from "../../utils/determineFoldRotation";
import { rotateBoard } from "../../utils/rotateBoard";
import { disposeObject3D } from "../../utils/disposeObject3D";

/** 折りアニメーションの所要時間（ミリ秒） */
const FOLD_DURATION_MS = 800;

/** 折り上がった板を浮かせるZオフセット（z-fighting回避） */
const FOLDED_Z_OFFSET = 0.05;

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
  setFoldPhase: (phase: FoldPhase) => void;
  foldLineState: FoldLineState | null;
  foldBoards: MovingAndStaticBoards | null;
  setFoldBoards: (boards: MovingAndStaticBoards | null) => void;
}) => void;

/**
 * 折り線を軸とした180度折りアニメーションを管理するカスタムフック
 *
 * @description
 * - foldPhaseがfoldingに遷移したらアニメーションを開始する
 * - ピボットGroup（board_moving_pivot）をrequestAnimationFrameで
 *   0→180度回転させる（easeInOutCubic、描画はuseInitSceneの
 *   アニメーションループが毎フレーム行う）
 * - 回転軸の向きはdetermineFoldRotationで決定し、板は常に+Z側
 *   （カメラ側）を通って折り返される
 * - アニメーション中はOrbitControlsを無効化する
 * - 完了時の処理:
 *   - 折り線シリンダーを削除
 *   - 折り上がった板を+Zへわずかにオフセット（z-fighting回避）
 *   - rotateBoardで最終頂点座標を板データへ反映（多重折りへの布石）
 *   - foldPhaseをfoldedへ遷移
 *
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.controlsRef - OrbitControlsのref
 * @param props.foldPhase - 折り操作のフェーズ
 * @param props.setFoldPhase - フェーズを遷移させる関数
 * @param props.foldLineState - 確定した折り線の状態
 * @param props.foldBoards - 分割された板（完了時にbake結果で更新）
 * @param props.setFoldBoards - 分割された板を更新する関数
 */
export const useFoldAnimation: UseFoldAnimation = ({
  sceneRef,
  controlsRef,
  foldPhase,
  setFoldPhase,
  foldLineState,
  foldBoards,
  setFoldBoards,
}) => {
  useEffect(() => {
    if (foldPhase !== "folding") return;
    if (!foldLineState || !foldBoards) return;

    const scene = sceneRef.current;
    if (!scene) return;

    const pivotGroup = scene.getObjectByName("board_moving_pivot");
    if (!pivotGroup) return;

    const foldLine = { start: foldLineState.start, end: foldLineState.end };
    const axis = determineFoldRotation(foldLine, foldBoards.movingBoard);

    // 軸を決定できない場合は回転せずに折りを終了する（通常は起こり得ない）
    if (!axis) {
      setFoldPhase("folded");
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

      // 完全に重なるとz-fightingが起きるため、折り上がった板をわずかに浮かせる
      pivotGroup.position.z += FOLDED_Z_OFFSET;

      // 最終的な頂点座標を板データへ反映する
      const bakedMovingBoard = rotateBoard(
        foldBoards.movingBoard,
        foldLine.start,
        axis,
        Math.PI
      ).map((vertex) =>
        new THREE.Vector3(vertex.x, vertex.y, vertex.z + FOLDED_Z_OFFSET)
      );
      setFoldBoards({
        movingBoard: bakedMovingBoard,
        staticBoard: foldBoards.staticBoard,
      });

      if (controls) controls.enabled = true;
      setFoldPhase("folded");
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
  }, [
    sceneRef,
    controlsRef,
    foldPhase,
    setFoldPhase,
    foldLineState,
    foldBoards,
    setFoldBoards,
  ]);
};

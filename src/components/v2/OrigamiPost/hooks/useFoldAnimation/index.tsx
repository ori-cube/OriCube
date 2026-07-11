import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { FoldPhase, PendingFold } from "../../index";
import { determineFoldRotation } from "../../utils/determineFoldRotation";
import { removeFoldLine } from "../../utils/visualizeFoldLine";
import { easeInOutCubic } from "../../utils/easeInOutCubic";
import { computeSquashAnimationPositions } from "../../utils/computeSquashAnimationPositions";
import { computePetalAnimationPositions } from "../../utils/computePetalAnimationPositions";
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

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / FOLD_DURATION_MS, 1);
      const angle = easeInOutCubic(progress) * Math.PI;
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
      return createFoldAngleApplier(scene, pendingFold);
    case "squash":
      return createSquashAngleApplier(scene, pendingFold);
    case "petal":
      return createPetalAngleApplier(scene, pendingFold);
  }
};

/**
 * 通常の折りの回転適用関数を作成する
 *
 * @returns 回転角を受け取ってピボットGroupを回転させる関数。
 *          構成できない場合はnull
 */
const createFoldAngleApplier = (
  scene: THREE.Scene,
  pendingFold: Extract<PendingFold, { kind: "fold" }>
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

  const mirrorFoldLinePiece = result.movingPieces.find(
    (moving) => moving.motion === "mirrorFoldLine"
  );
  const mirrorHingePiece = result.movingPieces.find(
    (moving) => moving.motion === "mirrorHinge"
  );
  if (!mirrorFoldLinePiece || !mirrorHingePiece) return null;

  // 動く片は折ったときの視点側（表なら+Z、裏なら-Z）へ持ち上げる
  const liftDirection = new THREE.Vector3(0, 0, step.viewFront ? 1 : -1);
  const foldLineAxis = determineFoldRotation(
    step.foldLine,
    mirrorFoldLinePiece.piece.polygon,
    liftDirection
  );
  const hingeAxis = determineFoldRotation(
    result.hinge,
    mirrorHingePiece.piece.polygon,
    liftDirection
  );
  if (!foldLineAxis || !hingeAxis) return null;

  const spine = { start: result.spineApex, end: step.dragVertex };

  return (angle: number) => {
    const positions = computeSquashAnimationPositions({
      movingPieces: result.movingPieces,
      foldLine: step.foldLine,
      hinge: result.hinge,
      spine,
      foldLineAxis,
      hingeAxis,
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

  // 動く片は折ったときの視点側（表なら+Z、裏なら-Z）へ持ち上げる
  const liftDirection = new THREE.Vector3(0, 0, step.viewFront ? 1 : -1);

  const centralPiece = result.movingPieces.find(
    (moving) => moving.motion === "mirrorFoldLine"
  );
  if (!centralPiece) return null;
  const foldLineAxis = determineFoldRotation(
    result.foldLine,
    centralPiece.piece.polygon,
    liftDirection
  );

  // かぶせ折り線の回転軸は左右それぞれの耳片の持ち上がる向きで決める
  const kiteAxisFor = (sideIndex: 0 | 1): THREE.Vector3 | null => {
    const earPiece = result.movingPieces.find(
      (moving) =>
        moving.motion === "mirrorKite" && moving.sideIndex === sideIndex
    );
    if (!earPiece) return null;
    return determineFoldRotation(
      result.kiteLines[sideIndex],
      earPiece.piece.polygon,
      liftDirection
    );
  };
  const firstKiteAxis = kiteAxisFor(0);
  const secondKiteAxis = kiteAxisFor(1);
  if (!foldLineAxis || !firstKiteAxis || !secondKiteAxis) return null;

  return (angle: number) => {
    const positions = computePetalAnimationPositions({
      movingPieces: result.movingPieces,
      foldLine: result.foldLine,
      kiteLines: result.kiteLines,
      tuckCreases: result.tuckCreases,
      foldLineAxis,
      kiteAxes: [firstKiteAxis, secondKiteAxis],
      angle,
    });
    positions.forEach((piecePositions, index) => {
      updateMorphBoardMeshPositions(morphGroups[index], piecePositions);
    });
  };
};

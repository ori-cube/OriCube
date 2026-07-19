import { useCallback, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { FoldPhase } from "../../index";

type UseViewMode = (props: {
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.MutableRefObject<OrbitControls | null>;
  foldPhase: FoldPhase;
  setFoldPhase: (phase: FoldPhase) => void;
}) => {
  /** ビューモードの開始 / 終了を切り替える */
  toggleViewMode: () => void;
};

/**
 * ビューモード（確認用の回転視点）を管理するカスタムフック
 *
 * @description
 * - 折り操作を止めて（viewingフェーズ）、カメラの回転で折り上がりを
 *   確認できるモード。スナップポイントの非表示とレイヤーの分解表示は
 *   viewingフェーズを見てuseRenderBoardsが行う
 * - 通常はOrbitControlsの回転が無効（ドラッグは頂点の折り操作に使う）
 *   なので、ビューモード中だけ回転を有効にする
 * - 終了時はカメラを開始時の位置へ戻し、上から見た折り視点を復元する
 *
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.controlsRef - OrbitControlsのref
 * @param props.foldPhase - 折り操作のフェーズ
 * @param props.setFoldPhase - フェーズを遷移させる関数
 */
export const useViewMode: UseViewMode = ({
  cameraRef,
  controlsRef,
  foldPhase,
  setFoldPhase,
}) => {
  // ビューモード開始時のカメラ位置（終了時に復元する）
  const savedCameraPositionRef = useRef<THREE.Vector3 | null>(null);

  const toggleViewMode = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (foldPhase === "idle") {
      savedCameraPositionRef.current = camera.position.clone();
      controls.enableRotate = true;
      setFoldPhase("viewing");
      return;
    }

    if (foldPhase === "viewing") {
      controls.enableRotate = false;
      const savedPosition = savedCameraPositionRef.current;
      if (savedPosition) {
        camera.position.copy(savedPosition);
        camera.lookAt(0, 0, 0);
        controls.update();
      }
      savedCameraPositionRef.current = null;
      setFoldPhase("idle");
    }
  }, [cameraRef, controlsRef, foldPhase, setFoldPhase]);

  return { toggleViewMode };
};

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { easeInOutCubic } from "../../utils/easeInOutCubic";

/** 裏返しアニメーションの所要時間（ミリ秒） */
const FLIP_DURATION_MS = 600;

type UseFlipView = (props: {
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.MutableRefObject<OrbitControls | null>;
}) => {
  /** 視点をY軸周りに180度回して折り紙を裏返す */
  flipView: () => void;
  /** 裏返しアニメーション中か */
  isFlipping: boolean;
};

/**
 * 折り紙を裏返す視点回転を管理するカスタムフック
 *
 * @description
 * - カメラをY軸周りに180度、rAF + easeInOutCubicで回転させる
 *   （描画はuseInitSceneのアニメーションループが毎フレーム行う）
 * - 折り紙のデータは変更しない。裏返した状態での折りは、ドロップ時の
 *   カメラ位置（zの符号）から視点を判定して処理する
 * - アニメーション中はOrbitControlsを無効化し、完了時に復帰する
 *
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.controlsRef - OrbitControlsのref
 */
export const useFlipView: UseFlipView = ({ cameraRef, controlsRef }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const animationFrameIdRef = useRef(0);

  // アンマウント時にアニメーションを止める
  useEffect(
    () => () => cancelAnimationFrame(animationFrameIdRef.current),
    []
  );

  const flipView = useCallback(() => {
    if (isFlipping) return;

    const camera = cameraRef.current;
    if (!camera) return;

    const controls = controlsRef.current;
    if (controls) controls.enabled = false;
    setIsFlipping(true);

    const startPosition = camera.position.clone();
    const yAxis = new THREE.Vector3(0, 1, 0);
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / FLIP_DURATION_MS, 1);
      const angle = easeInOutCubic(progress) * Math.PI;

      camera.position.copy(
        startPosition.clone().applyAxisAngle(yAxis, angle)
      );
      camera.lookAt(0, 0, 0);

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        if (controls) {
          controls.enabled = true;
          controls.update();
        }
        setIsFlipping(false);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);
  }, [isFlipping, cameraRef, controlsRef]);

  return { flipView, isFlipping };
};

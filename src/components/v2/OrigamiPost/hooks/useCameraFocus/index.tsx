import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { LayeredBoard } from "../../types";
import { computeBoardsCenter } from "../../utils/computeBoardsCenter";
import { easeInOutCubic } from "../../utils/easeInOutCubic";

/** 視点の平行移動アニメーションの所要時間（ミリ秒） */
const PAN_DURATION_MS = 400;

/** これ未満の移動量では視点を動かさない（微小なズレの無視） */
const MIN_PAN_DISTANCE = 0.01;

type UseCameraFocus = (props: {
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.MutableRefObject<OrbitControls | null>;
  currentBoards: LayeredBoard[];
}) => void;

/**
 * 折り紙の中心に視点を追従させるカスタムフック
 *
 * @description
 * - 折るたびに紙の占める領域が移動するが、回転の中心
 *   （OrbitControlsのtarget）が原点のままだと、ビューモードや
 *   裏返しの回転が紙の中心からずれて違和感が出る
 * - 板群が変わったら（折りの確定・Undo・Redo）、板群の
 *   バウンディングボックス中心へOrbitControlsのtargetを移し、
 *   カメラも同じ差分だけ平行移動させる。純粋な平行移動なので
 *   カメラの向きは変わらず、紙が画面中央へ滑らかにスライドする
 *
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.controlsRef - OrbitControlsのref
 * @param props.currentBoards - 現在の板群
 */
export const useCameraFocus: UseCameraFocus = ({
  cameraRef,
  controlsRef,
  currentBoards,
}) => {
  const animationFrameIdRef = useRef(0);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const center = computeBoardsCenter(currentBoards);
    const delta = center.clone().sub(controls.target);
    if (delta.length() < MIN_PAN_DISTANCE) return;

    const startTarget = controls.target.clone();
    const startPosition = camera.position.clone();
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / PAN_DURATION_MS, 1);
      const offset = delta.clone().multiplyScalar(easeInOutCubic(progress));

      controls.target.copy(startTarget.clone().add(offset));
      camera.position.copy(startPosition.clone().add(offset));
      controls.update();

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameIdRef.current);
  }, [cameraRef, controlsRef, currentBoards]);
};

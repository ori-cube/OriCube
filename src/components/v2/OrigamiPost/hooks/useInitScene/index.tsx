import * as THREE from "three";
import { useCallback, useEffect, useRef } from "react";
import { OrbitControls } from "three/examples/jsm/Addons.js";

import { createDemandRenderer } from "@/utils/three/demandRenderer";
import { removeObjects } from "@/utils/three/removeObjects";

type UseInitScene = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  controlsRef: React.MutableRefObject<OrbitControls | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  autoResize?: boolean;
  width: number;
  height: number;
  cameraPosition: { x: number; y: number; z: number };
}) => () => void;

/**
 * Three.jsシーンの初期化を行うカスタムフック
 *
 * @description
 * - Three.jsのシーン、カメラ、レンダラー、コントロール、レイキャスターを初期化
 * - ライティング（環境光・指向性ライト）を設定
 * - 変更があるときだけ描画を予約
 * - ウィンドウリサイズ時の対応を設定
 *
 * @param props.canvasRef - HTMLCanvasElementのref
 * @param props.sceneRef - THREE.Sceneのref
 * @param props.cameraRef - THREE.PerspectiveCameraのref
 * @param props.rendererRef - THREE.WebGLRendererのref
 * @param props.controlsRef - OrbitControlsのref
 * @param props.raycasterRef - THREE.Raycasterのref
 * @param props.width - カンバスの幅
 * @param props.height - カンバスの高さ
 * @param props.cameraPosition - カメラの初期位置
 */
export const useInitScene: UseInitScene = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  controlsRef,
  raycasterRef,
  width,
  height,
  cameraPosition,
  autoResize = true,
}) => {
  const renderRef = useRef<(() => void) | null>(null);
  const requestRender = useCallback(() => renderRef.current?.(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // シーンの作成
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // レンダラーの作成
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // カメラの作成
    const camera = new THREE.PerspectiveCamera(40, 1, 10, 1000);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    cameraRef.current = camera;

    // コントロールの作成
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableRotate = false;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // レイキャスターの作成
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // ライティングの設定
    //
    // Lambert材質の描画色は 放射照度/π なので、正面向き（±Z）の面で
    // 環境光 + 平行光×cos(入射角) = π になるよう調整し、選択した色が
    // ほぼそのまま表示されるようにする。平行光の方向(±10,±10,±5)は
    // 法線±Zとのcosが1/3のため、3π/4 + (3π/4)(1/3) = π となる。
    // アニメーション中に傾いた面だけが陰影で暗くなる
    const LIGHT_INTENSITY = (3 * Math.PI) / 4;

    const ambientLight = new THREE.AmbientLight(0xffffff, LIGHT_INTENSITY);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      LIGHT_INTENSITY
    );
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // 裏返して見たときも同じ明るさになるよう、背面側からも同強度で照らす
    const backLight = new THREE.DirectionalLight(0xffffff, LIGHT_INTENSITY);
    backLight.position.set(-10, -10, -5);
    scene.add(backLight);

    const rendering = createDemandRenderer(controls, () => {
      renderer.render(scene, camera);
    });
    renderRef.current = rendering.requestRender;

    return () => {
      rendering.dispose();
      renderRef.current = null;
      controls.dispose();
      removeObjects(scene);
      renderer.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      raycasterRef.current = null;
    };
  }, [canvasRef, sceneRef, cameraRef, rendererRef, controlsRef, raycasterRef]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.lookAt(controls.target);
    controls.update();
    requestRender();
  }, [
    cameraRef,
    controlsRef,
    cameraPosition.x,
    cameraPosition.y,
    cameraPosition.z,
    requestRender,
  ]);

  useEffect(() => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!camera || !renderer) return;
    const resize = (nextWidth: number, nextHeight: number) => {
      const safeWidth = Math.max(1, nextWidth);
      const safeHeight = Math.max(1, nextHeight);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(safeWidth, safeHeight);
      requestRender();
    };
    resize(width, height);
    const handleResize = () => resize(window.innerWidth - 320, window.innerHeight);
    if (autoResize) window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [cameraRef, rendererRef, width, height, requestRender, autoResize]);

  return requestRender;
};

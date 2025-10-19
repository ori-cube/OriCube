import * as THREE from "three";
import { useEffect } from "react";
import { OrbitControls } from "three/examples/jsm/Addons.js";

type UseInitScene = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  controlsRef: React.MutableRefObject<OrbitControls | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  width: number;
  height: number;
  cameraPosition: { x: number; y: number; z: number };
}) => void;

/**
 * Three.jsシーンの初期化を行うカスタムフック
 *
 * @description
 * - Three.jsのシーン、カメラ、レンダラー、コントロール、レイキャスターを初期化
 * - ライティング（環境光・指向性ライト）を設定
 * - アニメーションループを開始
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
}) => {
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
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // カメラの作成
    const camera = new THREE.PerspectiveCamera(40, width / height, 10, 1000);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // アニメーションループ
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // リサイズハンドラー
    const handleResize = () => {
      const newWidth = window.innerWidth - 320;
      const newHeight = window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    raycasterRef,
    width,
    height,
    cameraPosition,
  ]);
};

/* 
シーンの初期化をするカスタムフック。
canvas要素、scene、camera、renderer、controls、raycasterを初期化する。
また、リサイズ時にカメラのアスペクト比を変更するリスナーの設定を行う。
**/

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
}) => void;

export const useInitScene: UseInitScene = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  controlsRef,
  raycasterRef,
}) => {
  useEffect(() => {
    const sizes = {
      width: window.innerWidth - 320,
      height: window.innerHeight,
    };
    const canvas = canvasRef.current!;
    const scene = new THREE.Scene();
    let renderer = rendererRef.current;
    let camera = cameraRef.current;
    let controls = controlsRef.current;
    let raycaster = raycasterRef.current;

    sceneRef.current = scene;

    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;
    }

    if (!camera) {
      camera = new THREE.PerspectiveCamera(
        40,
        sizes.width / sizes.height,
        10,
        1000
      );
      camera.position.set(0, 0, 120);
      camera.lookAt(new THREE.Vector3(0, 0, 0)); // モデルの中心を見るようにカメラの向きを設定
      scene.add(camera);
      cameraRef.current = camera;
    }

    if (!controls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;
    }

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };

    if (!raycaster) {
      raycaster = new THREE.Raycaster();
      raycasterRef.current = raycaster;
    }

    render();

    const resizeListener = () => {
      sizes.width = window.innerWidth - 320;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    window.addEventListener("resize", resizeListener);

    return () => {
      window.removeEventListener("resize", resizeListener);
    };
  }, [cameraRef, canvasRef, controlsRef, raycasterRef, rendererRef, sceneRef]);
};

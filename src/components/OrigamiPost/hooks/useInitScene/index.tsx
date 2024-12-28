/* 
シーンの初期化をするカスタムフック。
**/

import * as THREE from "three";
import { useEffect } from "react";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Board } from "@/types/three";
import { renderBoard } from "../../logics/renderBoard";

type UseInitScene = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  controlsRef: React.MutableRefObject<OrbitControls | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  fixBoards: Board[];
  inputStep: string;
  origamiColor: string;
}) => void;

export const useInitScene: UseInitScene = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  controlsRef,
  raycasterRef,
  fixBoards,
  inputStep,
  origamiColor,
}) => {
  useEffect(() => {
    const sizes = {
      width: window.innerWidth - 320,
      height: window.innerHeight,
    };
    if (inputStep !== "axis") return;
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

    // selectedPoints.forEach((point) => renderPoint({ scene, point }));
    fixBoards.forEach((board) =>
      renderBoard({ scene, board, color: origamiColor })
    );

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
  }, [
    cameraRef,
    canvasRef,
    controlsRef,
    fixBoards,
    inputStep,
    origamiColor,
    raycasterRef,
    rendererRef,
    sceneRef,
  ]);
};

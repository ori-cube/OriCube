import { useEffect, useState } from "react";
import * as THREE from "three";
import { Step } from "../../FoldMethodControlPanel";
import { Board, Point } from "@/types/three";
import { isOnLeftSide } from "../../logics/isOnLeftSide";
import { LineGeometry } from "three/examples/jsm/Addons.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Line2 } from "three/examples/jsm/Addons.js";

type UseDecideTargetBoard = (props: {
  setInputStep: React.Dispatch<React.SetStateAction<Step>>;
  inputStep: Step;
  rotateAxis: [Point, Point] | [];
  leftBoards: Board[];
  rightBoards: Board[];
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
}) => {
  handleDecideFoldTarget: () => void;
  isMoveBoardsRight: boolean;
};

export const useDecideTargetBoard: UseDecideTargetBoard = ({
  setInputStep,
  inputStep,
  rotateAxis,
  leftBoards,
  rightBoards,
  canvasRef,
  sceneRef,
  cameraRef,
  raycasterRef,
}) => {
  const [isMoveBoardsRight, setIsMoveBoardsRight] = useState(true);
  useEffect(() => {
    const sizes = {
      width: window.innerWidth - 320,
      height: window.innerHeight,
    };
    if (inputStep !== "target") return;
    if (rotateAxis.length === 0) return;
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Raycasterのセットアップ
    raycasterRef.current = new THREE.Raycaster();
    const raycaster = raycasterRef.current;

    if (!canvas || !scene || !camera) return;

    const hoverListener = (event: MouseEvent) => {
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const firstIntersect = intersects[0].object;
        if (firstIntersect.type === "Mesh") {
          const mesh = firstIntersect as THREE.Mesh;
          const edges = Array.from(mesh.geometry.attributes.position.array);
          const firstVertex = edges.slice(0, 3);
          edges.push(...firstVertex);
          const lineGeometry = new LineGeometry();
          lineGeometry.setPositions(edges);
          const lineMaterial = new LineMaterial({
            color: 0x009dff,
            linewidth: 3,
          });
          const line = new Line2(lineGeometry, lineMaterial);
          line.name = "Border";
          scene.add(line);
        } else {
          scene.children = scene.children.filter(
            (child) => child.name !== "Border"
          );
        }
      } else {
        scene.children = scene.children.filter(
          (child) => child.name !== "Border"
        );
      }
    };

    canvas.addEventListener("mousemove", hoverListener);

    const clickListener = (event: MouseEvent) => {
      // クリックしたオブジェクトを取得
      // そいつが軸の右か左かを判定 isOnLeftSideを使う
      // isMoveBoardsRightを変更する
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const point = intersects[0].point;

        const isTargetLeft = isOnLeftSide({
          point: [point.x, point.y, point.z],
          axis1: rotateAxis[0],
          axis2: rotateAxis[1],
        });

        setIsMoveBoardsRight(!isTargetLeft);

        scene.children = scene.children.filter(
          (child) => child.name !== "SelectedBorder"
        );

        if (isTargetLeft) {
          // leftBoardsのそれぞれの板にBoarderを描画
          leftBoards.forEach((board) => {
            const edges = Array.from(board.flat());
            const firstVertex = edges.slice(0, 3);
            edges.push(...firstVertex);
            const lineGeometry = new LineGeometry();
            lineGeometry.setPositions(edges);
            const lineMaterial = new LineMaterial({
              color: 0x4400ff,
              linewidth: 3,
            });
            const line = new Line2(lineGeometry, lineMaterial);
            line.name = "SelectedBorder";
            scene.add(line);
          });
        } else {
          rightBoards.forEach((board) => {
            const edges = Array.from(board.flat());
            const firstVertex = edges.slice(0, 3);
            edges.push(...firstVertex);
            const lineGeometry = new LineGeometry();
            lineGeometry.setPositions(edges);
            const lineMaterial = new LineMaterial({
              color: 0x4400ff,
              linewidth: 3,
            });
            const line = new Line2(lineGeometry, lineMaterial);
            line.name = "SelectedBorder";
            scene.add(line);
          });
        }
      }
    };

    canvas.addEventListener("click", clickListener);

    return () => {
      canvas.removeEventListener("mousemove", hoverListener);
      canvas.removeEventListener("click", clickListener);
    };
  }, [
    inputStep,
    cameraRef,
    canvasRef,
    raycasterRef,
    rotateAxis,
    sceneRef,
    leftBoards,
    rightBoards,
  ]);

  const handleDecideFoldTarget = () => {
    setInputStep("fold");
  };

  return {
    handleDecideFoldTarget,
    isMoveBoardsRight,
  };
};

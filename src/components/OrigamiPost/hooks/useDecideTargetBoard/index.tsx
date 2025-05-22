/* 
右左どちらの板を折るかを決定するための処理をまとめたカスタムフック
isMoveBoardsRightを決定する。
**/

import { useEffect } from "react";
import * as THREE from "three";
import { isOnLeftSide } from "../../logics/isOnLeftSide";
import { LineGeometry } from "three/examples/jsm/Addons.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Line2 } from "three/examples/jsm/Addons.js";
import { renderBoard } from "../../logics/renderBoard";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom } from "jotai";

type UseDecideTargetBoard = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  origamiColor: string;
}) => {
  handleDecideFoldTarget: () => void;
};

export const useDecideTargetBoard: UseDecideTargetBoard = ({
  canvasRef,
  sceneRef,
  cameraRef,
  raycasterRef,
  origamiColor,
}) => {
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

  const inputStep = currentStep.inputStep;
  const procedureIndex = currentStep.procedureIndex;
  const step = inputStepObject[procedureIndex.toString()];

  const rotateAxis = step.rotateAxis;
  const leftBoards = step.leftBoards;
  const rightBoards = step.rightBoards;

  // 板の描画
  useEffect(() => {
    if (inputStep !== "target") return;
    if (rotateAxis.length === 0) return;

    // sceneの初期化
    const scene = sceneRef.current;
    if (!scene) return;
    scene.children = [];

    // 折り線を描画
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([
      rotateAxis[0][0],
      rotateAxis[0][1],
      rotateAxis[0][2],
      rotateAxis[1][0],
      rotateAxis[1][1],
      rotateAxis[1][2],
    ]);
    const lineMaterial = new LineMaterial({
      color: 0xff00ff,
      linewidth: 3,
    });
    const lineMesh = new Line2(lineGeometry, lineMaterial);
    lineMesh.name = "Axis";
    scene.add(lineMesh);

    leftBoards.forEach((board) =>
      renderBoard({ scene, board, color: origamiColor })
    );
    rightBoards.forEach((board) =>
      renderBoard({ scene, board, color: origamiColor })
    );
  }, [
    step.type,
    inputStep,
    sceneRef,
    rotateAxis,
    leftBoards,
    rightBoards,
    origamiColor,
  ]);

  // 板をホバー、クリックしたときの処理
  useEffect(() => {
    if (inputStep !== "target") return;
    if (rotateAxis.length === 0) return;

    const sizes = {
      width: window.innerWidth - 320,
      height: window.innerHeight,
    };
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

        setInputStepObject((prev) => ({
          ...prev,
          [procedureIndex.toString()]: {
            ...prev[procedureIndex.toString()],
            isMoveBoardsRight: !isTargetLeft,
          },
        }));

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
    step.type,
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
    setCurrentStep({ ...currentStep, inputStep: "fold" });
  };

  return {
    handleDecideFoldTarget,
  };
};

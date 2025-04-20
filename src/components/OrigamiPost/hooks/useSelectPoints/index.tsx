/* 
step1での、点の選択を管理するカスタムフック
inputStepがaxisの時の板の描画と点の選択を行う
**/
import React, { useEffect } from "react";
import * as THREE from "three";
import { renderPoint } from "../../logics/renderPoint";
import { renderBoard } from "../../logics/renderBoard";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom, useAtomValue } from "jotai";

type UseSelectPoints = (props: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  origamiColor: string;
}) => void;

export const useSelectPoints: UseSelectPoints = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  raycasterRef,
  origamiColor,
}) => {
  const currentStep = useAtomValue(currentStepAtom);
  const [inputStepObject, setInputStepObject] = useAtom(inputStepObjectAtom);

  const inputStep = currentStep.inputStep;
  const procedureIndex = currentStep.procedureIndex;
  const fixBoards = inputStepObject[procedureIndex.toString()].fixBoards;
  const selectedPoints =
    inputStepObject[procedureIndex.toString()].selectedPoints;

  // boardとpointの初期描画をする処理
  useEffect(() => {
    if (inputStep !== "axis") return;
    const scene = sceneRef.current!;
    const renderer = rendererRef.current!;
    const camera = cameraRef.current!;

    // sceneの初期化
    scene.children = [];

    // pointsを描画
    selectedPoints.forEach((point) => {
      renderPoint({ scene, point });
    });
    // boardsを描画
    fixBoards.forEach((board) => {
      renderBoard({ scene, board, color: origamiColor });
    });

    renderer.render(scene, camera);

    // selectedPointsが変更されたときの描画は、下のuseEffectで行う
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputStep, sceneRef, rendererRef, cameraRef, fixBoards, origamiColor]);

  // モデル上の点を選択できるようにする処理
  useEffect(() => {
    const sizes = {
      width: window.innerWidth - 320,
      height: window.innerHeight,
    };
    if (inputStep !== "axis") return;
    const canvas = canvasRef.current!;
    const scene = sceneRef.current!;
    const renderer = rendererRef.current!;
    const camera = cameraRef.current!;
    const raycaster = raycasterRef.current!;

    const clickListener = (event: MouseEvent) => {
      // マウスの座標を正規化して取得
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

      // エッジに対してRaycasterを適用して交差を調べる
      raycaster.setFromCamera(mouse, camera);
      const edges = scene.children.filter(
        (child) => child.type === "LineSegments"
      );
      const intersects = raycaster.intersectObjects(edges, true);

      // 現在記録している点の数が2個未満の場合は、新しい点を追加, 2個以上の場合は最初の点を消して、新しい点を追加
      if (intersects.length > 0) {
        const point = intersects[0].point; // 新しく選択された点
        let newPoints = [...selectedPoints];

        if (selectedPoints.length < 2) {
          newPoints.push([point.x, point.y, point.z]);
        } else {
          newPoints = newPoints.slice(1);
          newPoints.push([point.x, point.y, point.z]);
        }

        // 既存のpointを削除する
        scene.children = scene.children.filter(
          (child) => child.name !== "Point"
        );
        // pointsを描画し直す
        newPoints.forEach((point) => {
          renderPoint({ scene, point });
        });
        setInputStepObject((prev) => ({
          ...prev,
          [procedureIndex.toString()]: {
            ...prev[procedureIndex.toString()],
            selectedPoints: newPoints,
          },
        }));

        renderer.render(scene, camera);
      }
    };

    canvas.addEventListener("click", clickListener);
    return () => {
      canvas.removeEventListener("click", clickListener);
    };
  }, [
    selectedPoints,
    inputStep,
    canvasRef,
    sceneRef,
    rendererRef,
    cameraRef,
    raycasterRef,
  ]);
};

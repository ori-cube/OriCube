/* 
点の選択処理を行うフック
- ハイライトされている点を選択点として追加
- 選択点が2つ以上ある場合
  - 2個のうち先に選択した点を削除
  - 新しい点を選択点として追加
**/

import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { renderSelectedPoint } from "./renderPoint";
import { InputStepObject } from "../../atoms/inputStepObjectAtom";

type UseClickHandler = (props: {
  inputStep: string;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  selectedPoints: Point[];
  highlightedVertex: THREE.Vector3 | null;
  procedureIndex: number;
  setInputStepObject: (
    updater: (prev: InputStepObject) => InputStepObject
  ) => void;
}) => void;

export const useClickHandler: UseClickHandler = ({
  inputStep,
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  selectedPoints,
  highlightedVertex,
  procedureIndex,
  setInputStepObject,
}) => {
  useEffect(() => {
    if (inputStep !== "axis") return;
    const canvas = canvasRef.current!;
    const scene = sceneRef.current!;
    const renderer = rendererRef.current!;
    const camera = cameraRef.current!;

    const clickListener = () => {
      if (!highlightedVertex) return;

      // ハイライトされている頂点を選択
      let newPoints = [...selectedPoints];

      if (selectedPoints.length < 2) {
        newPoints.push([
          highlightedVertex.x,
          highlightedVertex.y,
          highlightedVertex.z,
        ]);
      } else {
        newPoints = newPoints.slice(1);
        newPoints.push([
          highlightedVertex.x,
          highlightedVertex.y,
          highlightedVertex.z,
        ]);
      }

      // 既存のpointを削除する
      scene.children = scene.children.filter((child) => child.name !== "Point");
      // pointsを描画し直す
      newPoints.forEach((point) => {
        renderSelectedPoint({ scene, point });
      });
      setInputStepObject((prev) => ({
        ...prev,
        [procedureIndex.toString()]: {
          ...prev[procedureIndex.toString()],
          selectedPoints: newPoints,
        },
      }));

      renderer.render(scene, camera);
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
    highlightedVertex,
    procedureIndex,
    setInputStepObject,
  ]);
};

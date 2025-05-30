/* 
step1での、点の選択を管理するカスタムフック
inputStepがaxisの時の板の描画と点の選択を行う
**/
import React from "react";
import * as THREE from "three";
import { currentStepAtom } from "../../atoms/currentStepAtom";
import { inputStepObjectAtom } from "../../atoms/inputStepObjectAtom";
import { useAtom, useAtomValue } from "jotai";
import { useInitialRender } from "./useInitialRender";
import { useMouseMove } from "./useMouseMove";
import { useClickHandler } from "./useClickHandler";

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
  const [highlightedVertex, setHighlightedVertex] =
    React.useState<THREE.Vector3 | null>(null);

  const inputStep = currentStep.inputStep;
  const procedureIndex = currentStep.procedureIndex;
  const step = inputStepObject[procedureIndex.toString()];

  const fixBoards = step.fixBoards;
  const selectedPoints = step.selectedPoints;

  useInitialRender({
    inputStep,
    sceneRef,
    rendererRef,
    cameraRef,
    fixBoards,
    selectedPoints,
    origamiColor,
  });

  useMouseMove({
    inputStep,
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    fixBoards,
    setHighlightedVertex,
  });

  useClickHandler({
    inputStep,
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    selectedPoints,
    highlightedVertex,
    procedureIndex,
    setInputStepObject,
  });
};

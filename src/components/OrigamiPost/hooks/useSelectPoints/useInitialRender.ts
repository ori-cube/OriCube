/* 
step1で、点の選択を行うための初期描画を行うフック
- sceneの初期化
- 板の描画
- スナップポイント(頂点と辺の中心点)の描画
**/

import { useEffect } from "react";
import * as THREE from "three";
import { renderSelectedPoint, renderSnapPoint } from "./renderPoint";
import { renderBoard } from "../../logics/renderBoard";
import { Point, Board } from "@/types/model";

type UseInitialRender = (props: {
  inputStep: string;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  initialBoards: Board[];
  selectedPoints: Point[];
  origamiColor: string;
}) => void;

export const useInitialRender: UseInitialRender = ({
  inputStep,
  sceneRef,
  rendererRef,
  cameraRef,
  initialBoards,
  selectedPoints,
  origamiColor,
}) => {
  useEffect(() => {
    if (inputStep !== "axis") return;
    const scene = sceneRef.current!;
    const renderer = rendererRef.current!;
    const camera = cameraRef.current!;

    // sceneの初期化
    scene.children = [];

    // pointsを描画
    selectedPoints.forEach((point) => {
      renderSelectedPoint({ scene, point });
    });

    // boardsを描画
    initialBoards.forEach((board) => {
      renderBoard({ scene, board, color: origamiColor });

      // 頂点のスナップポイントを描画
      board.forEach((vertex) => {
        renderSnapPoint({ scene, point: vertex });
      });

      // 辺の中心点のスナップポイントを描画
      for (let i = 0; i < board.length; i++) {
        const nextIndex = (i + 1) % board.length;
        const currentVertex = board[i];
        const nextVertex = board[nextIndex];

        // 中心点を計算
        const centerPoint: Point = [
          (currentVertex[0] + nextVertex[0]) / 2,
          (currentVertex[1] + nextVertex[1]) / 2,
          (currentVertex[2] + nextVertex[2]) / 2,
        ];

        renderSnapPoint({ scene, point: centerPoint });
      }
    });

    renderer.render(scene, camera);
  }, [
    inputStep,
    sceneRef,
    rendererRef,
    cameraRef,
    initialBoards,
    origamiColor,
    selectedPoints,
  ]);
};

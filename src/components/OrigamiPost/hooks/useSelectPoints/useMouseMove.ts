/*
マウス移動時のスナップ処理を行うフック
- マウスの監視
- マウスが頂点、中心点の近くにある場合
  - 最も近くにある頂点または中心点をハイライト
- 近くにない場合
  - マウスと板上の辺の交点をハイライト
**/

import { useEffect } from "react";
import * as THREE from "three";
import { Point } from "@/types/model";
import { renderHighlightPoint } from "../../logics/renderPoint";

type UseMouseMoveProps = {
  inputStep: string;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  fixBoards: Point[][];
  setHighlightedVertex: (vertex: THREE.Vector3 | null) => void;
};

export const useMouseMove = ({
  inputStep,
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  raycasterRef,
  fixBoards,
  setHighlightedVertex,
}: UseMouseMoveProps) => {
  const SNAP_THRESHOLD = 0.1; // スナップする距離の閾値

  useEffect(() => {
    if (inputStep !== "axis") return;
    const canvas = canvasRef.current!;
    const scene = sceneRef.current!;
    const camera = cameraRef.current!;
    const renderer = rendererRef.current!;
    const raycaster = raycasterRef.current!;

    const mouseMoveListener = (event: MouseEvent) => {
      const sizes = {
        width: window.innerWidth - 320,
        height: window.innerHeight,
      };

      // マウス座標の正規化
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

      // 全ての板の頂点と辺の中心点を取得
      let closestVertex: THREE.Vector3 | null = null;
      let minDistance = Infinity;

      // 頂点と辺の中心点のチェック
      fixBoards.forEach((board) => {
        // 頂点のチェック
        board.forEach((vertex) => {
          const vertexVector = new THREE.Vector3(
            vertex[0],
            vertex[1],
            vertex[2]
          );
          const vertexScreenPos = vertexVector.clone().project(camera);
          const distance = new THREE.Vector2(mouse.x, mouse.y).distanceTo(
            new THREE.Vector2(vertexScreenPos.x, vertexScreenPos.y)
          );
          if (distance < SNAP_THRESHOLD && distance < minDistance) {
            minDistance = distance;
            closestVertex = vertexVector;
          }
        });

        // 辺の中心点のチェック
        for (let i = 0; i < board.length; i++) {
          const nextIndex = (i + 1) % board.length;
          const currentVertex = board[i];
          const nextVertex = board[nextIndex];

          const centerPoint = new THREE.Vector3(
            (currentVertex[0] + nextVertex[0]) / 2,
            (currentVertex[1] + nextVertex[1]) / 2,
            (currentVertex[2] + nextVertex[2]) / 2
          );

          const centerScreenPos = centerPoint.clone().project(camera);
          const distance = new THREE.Vector2(mouse.x, mouse.y).distanceTo(
            new THREE.Vector2(centerScreenPos.x, centerScreenPos.y)
          );

          if (distance < SNAP_THRESHOLD && distance < minDistance) {
            minDistance = distance;
            closestVertex = centerPoint;
          }
        }
      });

      // 頂点も辺の中心点も見つからない場合は、エッジ上の最近点を探す
      if (!closestVertex) {
        raycaster.setFromCamera(mouse, camera);
        const edges = scene.children.filter(
          (child) => child.type === "LineSegments"
        );
        const intersects = raycaster.intersectObjects(edges, true);

        if (intersects.length > 0) {
          closestVertex = intersects[0].point;
        }
      }

      // 既存のハイライトを削除
      scene.children = scene.children.filter(
        (child) => child.name !== "HighlightPoint"
      );

      // 新しいハイライトを描画
      if (closestVertex) {
        renderHighlightPoint({
          scene,
          point: [closestVertex.x, closestVertex.y, closestVertex.z],
        });
        setHighlightedVertex(closestVertex);
      } else {
        setHighlightedVertex(null);
      }

      renderer.render(scene, camera);
    };

    canvas.addEventListener("mousemove", mouseMoveListener);
    return () => {
      canvas.removeEventListener("mousemove", mouseMoveListener);
    };
  }, [
    inputStep,
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    fixBoards,
    setHighlightedVertex,
  ]);
};

"use client";

import React, { useEffect, useRef } from "react";
import styles from "./index.module.scss";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { separateBoard } from "./logics/separateBoard";

type Point = [number, number, number];
type Board = Point[];

const renderBoard = (scene: THREE.Scene, board: Board) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(board.flat()), 3)
  );

  if (board.length >= 4) {
    const indices = [];
    for (let j = 0; j < board.length - 2; j++) {
      indices.push(0, j + 1, j + 2);
    }
    geometry.setIndex(indices);
  }

  const frontMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("red"),
    side: THREE.FrontSide,
    transparent: true,
  });
  const backMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#DFDFDF"),
    side: THREE.BackSide,
    transparent: true,
  });
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
  });

  const frontMesh = new THREE.Mesh(geometry, frontMaterial);
  const backMesh = new THREE.Mesh(geometry, backMaterial);
  scene.add(frontMesh);
  scene.add(backMesh);

  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);
  scene.add(wireframe);
};

export const OrigamiPost = () => {
  const initialBoard: Board = [
    [18, 18, 0],
    [-18, 18, 0],
    [-18, -18, 0],
    [18, -18, 0],
  ];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);

  const points: Point[] = [];

  // シーンの初期化
  useEffect(() => {
    if (sceneRef.current) return; // シーンが既に初期化されている場合は何もしない

    const canvas = canvasRef.current!;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      40,
      sizes.width / sizes.height,
      10,
      1000
    );
    camera.position.set(20, 70, 100); // 右斜め上からモデルを見るようにカメラ位置を設定
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // モデルの中心を見るようにカメラの向きを設定
    scene.add(camera);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };

    renderBoard(scene, initialBoard);

    raycasterRef.current = new THREE.Raycaster();

    render();

    window.addEventListener("resize", () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    });

    canvas.addEventListener("click", (event) => {
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

      // Raycasterのセットアップ
      if (!raycasterRef.current) return;
      raycasterRef.current.setFromCamera(mouse, camera);

      // エッジに対してRaycasterを適用して交差を調べる
      const edges = scene.children.filter(
        (child) => child.type === "LineSegments"
      );
      const intersects = raycasterRef.current.intersectObjects(edges, true);

      if (intersects.length > 0) {
        const point = intersects[0].point; // 最初の交差点の座標を取得
        console.log("Clicked position on edge:", point);

        // pointで点を描画
        const geometry = new THREE.BufferGeometry().setFromPoints([point]);
        const material = new THREE.PointsMaterial({ color: 0x000000 });
        const pointMesh = new THREE.Points(geometry, material);
        scene.add(pointMesh);

        points.push([point.x, point.y, point.z]);

        if (points.length >= 2) {
          // この2点を結ぶ線で板を分割する。
          const axis: [Point, Point] = [[...points[0]], [...points[1]]];
          const separatedBoard = separateBoard({
            board: initialBoard,
            rotateAxis: axis,
          });
          console.log("Separated board:", separatedBoard);

          if (!separatedBoard) return alert("Failed to separate board.");

          // boardを削除する
          scene.children = scene.children.filter(
            (child) => child.type !== "Mesh" && child.type !== "LineSegments"
          );

          // pointを削除する
          scene.children = scene.children.filter(
            (child) => child.type !== "Points"
          );

          // 新しい板を描画する
          const { leftBoard, rightBoard } = separatedBoard;
          renderBoard(scene, leftBoard);
          renderBoard(scene, rightBoard);

          renderer.render(scene, camera);
        }
      }
    });

    return () => {
      window.removeEventListener("resize", () => {});
    };
  }, []);

  return <canvas ref={canvasRef} id="canvas" className={styles.model} />;
};

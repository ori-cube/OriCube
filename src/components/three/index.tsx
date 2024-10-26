"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./index.module.scss";
import { Procedure } from "@/types/model";
import { OrbitControls } from "three/examples/jsm/Addons.js";

type Props = {
  model: Procedure;
  foldAngle: number;
};

export const Three: React.FC<Props> = ({ model, foldAngle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const methodId = 2;
  const procedure = model[methodId.toString()];

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
    camera.position.set(0, 0, 2).multiplyScalar(70);
    scene.add(camera);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    render();

    window.addEventListener("resize", () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    });

    return () => {
      window.removeEventListener("resize", () => {});
    };
  }, []);

  // 回転に応じて板を描画
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const frontMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xff0000),
      side: THREE.FrontSide,
    });
    const backMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xa9a9a9),
      side: THREE.BackSide,
    });

    // 前の板を削除
    scene.children = scene.children.filter((child) => child.type === "Line");

    // そのままの板と、回転後の板を保持
    const boards = [...procedure.fixBoards];
    const theta = THREE.MathUtils.degToRad(foldAngle);
    const rotateAxis = new THREE.Vector3(...procedure.rotateAxis[0])
      .sub(new THREE.Vector3(...procedure.rotateAxis[1]))
      .normalize();
    const subNode = new THREE.Vector3(...procedure.rotateAxis[0]);

    for (let i = 0; i < procedure.moveBoards.length; i++) {
      const moveBoard = procedure.moveBoards[i];
      const newBoard = moveBoard.map((point) => {
        const node = new THREE.Vector3(...point);
        const rotateNode = node.clone().sub(subNode);
        rotateNode.applyAxisAngle(rotateAxis, theta);
        rotateNode.add(subNode);
        return [rotateNode.x, rotateNode.y, rotateNode.z];
      });
      boards.push(newBoard);
    }

    // 板を描画
    boards.forEach((board) => {
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
      const frontMesh = new THREE.Mesh(geometry, frontMaterial);
      const backMesh = new THREE.Mesh(geometry, backMaterial);
      scene.add(frontMesh);
      scene.add(backMesh);
    });
  }, [foldAngle, procedure]);

  return <canvas ref={canvasRef} id="canvas" className={styles.model}></canvas>;
};

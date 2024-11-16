"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./index.module.scss";
import { Procedure, isConvolutionProcedure } from "@/types/model";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { LineGeometry } from "three/examples/jsm/Addons.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Line2 } from "three/examples/jsm/Addons.js";

type Props = {
  model: Procedure;
  color: string;
  foldAngle: number;
  procedureIndex: number;
};

export const Three: React.FC<Props> = ({
  model,
  color,
  foldAngle,
  procedureIndex,
}) => {
  console.log(model);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const procedure = model[procedureIndex.toString()];

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
      color: new THREE.Color(color),
      side: THREE.FrontSide,
      transparent: true,
    });
    const backMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#DFDFDF"),
      side: THREE.BackSide,
      transparent: true,
    });

    // シーンをクリア
    scene.clear();

    // そのままの板と、回転後の板を保持
    const boards = [...procedure.fixBoards];
    const holds_line = [];
    const theta = THREE.MathUtils.degToRad(foldAngle);

    // 畳み込みの場合
    if (isConvolutionProcedure(procedure)) {
      const nodes = procedure.nodes.concat();
      for (let i = 0; i < procedure.moveNodesIdx.length; i++) {
        holds_line.push(
          new Float32Array([
            ...procedure.rotateAxes[i][0],
            ...procedure.rotateAxes[i][1],
          ])
        );
        const moveNode = new THREE.Vector3(...nodes[procedure.moveNodesIdx[i]]);
        const axis = new THREE.Vector3(...procedure.rotateAxes[i][0])
          .sub(new THREE.Vector3(...procedure.rotateAxes[i][1]))
          .normalize();
        const subNode = new THREE.Vector3(...procedure.rotateAxes[i][0]);
        const rotateNode = moveNode.clone().sub(subNode);
        rotateNode.applyAxisAngle(axis, theta);
        rotateNode.add(subNode);
        console.log(rotateNode);
        nodes[procedure.moveNodesIdx[i]] = [
          rotateNode.x,
          rotateNode.y,
          rotateNode.z,
        ];
      }
      for (let i = 0; i < procedure.boards.length; i++) {
        const board = procedure.boards[i];
        const newBoard = [];
        for (let j = 0; j < board.length; j++) {
          const node = new THREE.Vector3(...nodes[board[j]]);
          newBoard.push([node.x, node.y, node.z]);
        }
        boards.push(newBoard);
      }
    } else {
      // 通常の折り方の場合
      holds_line.push(
        new Float32Array([
          ...procedure.rotateAxis[0],
          ...procedure.rotateAxis[1],
        ])
      );
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
      const EdgesGeometry = new THREE.EdgesGeometry(geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({
        color: 0x000000, // ワイヤーフレームの色
        linewidth: 1,
      });
      const wireframe = new THREE.LineSegments(
        EdgesGeometry,
        wireframeMaterial
      );
      scene.add(wireframe);
    });

    // 折り目を描画
    holds_line.forEach((line) => {
      console.log(line);
      const geometry = new LineGeometry();
      geometry.setPositions(line);
      const lineMaterial = new LineMaterial({
        color: 0xff00ff,
        linewidth: 3,
      });
      const lineMesh = new Line2(geometry, lineMaterial);
      scene.add(lineMesh);
    });
  }, [foldAngle, procedure]);

  return <canvas ref={canvasRef} id="canvas" className={styles.model}></canvas>;
};

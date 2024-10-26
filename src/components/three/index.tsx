"use client";

import React, { useEffect, useState } from "react";
import * as THREE from "three";
import styles from "./index.module.scss";
import { Procedure } from "@/types/model";
import { OrbitControls } from "three/examples/jsm/Addons.js";

type Props = {
  model: Procedure;
  foldAngle: number;
};

export const Three: React.FC<Props> = ({ model, foldAngle }) => {
  let canvas: HTMLElement;

  const [methodId, setmethodId] = useState(2);
  const procedure = model[methodId.toString()];

  useEffect(() => {
    if (canvas) return;
    canvas = document.getElementById("canvas")!;

    const initScene = new THREE.Scene();

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    console.log(sizes);

    const initRenderer = new THREE.WebGLRenderer({
      canvas: canvas || undefined,
      antialias: true,
      alpha: true,
    });
    initRenderer.setSize(sizes.width, sizes.height);
    initRenderer.setPixelRatio(window.devicePixelRatio);

    const initCamera = new THREE.PerspectiveCamera(
      40,
      sizes.width / sizes.height,
      10,
      1000
    );
    initCamera.position.set(0, 0, 2).multiplyScalar(70);

    // OrbitControlsの有効化
    const initOrbit = new OrbitControls(initCamera, initRenderer.domElement);
    initOrbit.enableDamping = true;

    // 板の描画
    const frontMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xff0000),
      side: THREE.FrontSide,
    });
    const backMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xa9a9a9),
      side: THREE.BackSide,
    });

    const boards = [...procedure.fixBoards];

    const initOrigami = function () {
      initScene.children = initScene.children.filter(
        (child) => child.type === "Line"
      );
      for (let i = 0; i < boards.length; i++) {
        const board = boards[i];
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
        initScene.add(frontMesh);
        initScene.add(backMesh);
      }
    };

    const theta = THREE.MathUtils.degToRad(foldAngle);
    const rotateAxis = new THREE.Vector3(...procedure.rotateAxis[0])
      .sub(new THREE.Vector3(...procedure.rotateAxis[1]))
      .normalize();

    const subNode = new THREE.Vector3(...procedure.rotateAxis[0]);
    const newBoards = [];
    for (let i = 0; i < procedure.moveBoards.length; i++) {
      const moveBoard = procedure.moveBoards[i];
      const newBoard = [];
      console.log(moveBoard[2]);
      for (let j = 0; j < moveBoard.length; j++) {
        const node = new THREE.Vector3(...moveBoard[j]);
        const rotateNode = node.clone().sub(subNode);
        rotateNode.applyAxisAngle(rotateAxis, theta);
        rotateNode.add(subNode);
        newBoard.push([rotateNode.x, rotateNode.y, rotateNode.z]);
      }
      newBoards.push(newBoard);
    }

    boards.push(...newBoards);

    initOrigami();

    // レンダリング
    const render = () => {
      initOrbit.update();
      initRenderer.render(initScene, initCamera);
      requestAnimationFrame(render);
    };
    render();

    window.addEventListener("resize", () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      initCamera.aspect = sizes.width / sizes.height;
      initCamera.updateProjectionMatrix();
      initRenderer.setSize(sizes.width, sizes.height);
      initRenderer.setPixelRatio(window.devicePixelRatio);
    });
  }, [foldAngle]);

  return (
    <div>
      <canvas id="canvas" className={styles.model}></canvas>
    </div>
  );
};

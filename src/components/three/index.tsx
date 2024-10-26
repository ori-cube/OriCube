"use client";

import React, { useEffect, useState } from "react";
import * as THREE from "three";
import styles from "./index.module.scss";
import { Procedure } from "@/types/model";
import { OrbitControls } from "three/examples/jsm/Addons.js";

type Props = {
  model: Procedure;
};

export const Three: React.FC<Props> = ({ model }) => {
  let canvas: HTMLElement;

  const [boards, setBoards] = useState([
    ...model["1"].fixBoards,
    ...model["1"].moveBoards,
  ]);

  useEffect(() => {
    if (canvas) return;
    canvas = document.getElementById("canvas")!;

    const scene = new THREE.Scene();

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const camera = new THREE.PerspectiveCamera(
      40,
      sizes.width / sizes.height,
      10,
      1000
    );
    camera.position.set(0, 0, 2).multiplyScalar(70);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas || undefined,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // OrbitControlsの有効化
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    // 板の描画
    const frontMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xff0000),
      side: THREE.FrontSide,
    });
    const backMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xa9a9a9),
      side: THREE.BackSide,
    });

    scene.children = scene.children.filter((child) => child.type === "Line");
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
      scene.add(frontMesh);
      scene.add(backMesh);
    }

    // アニメーションループ
    const animate = () => {
      orbit.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener("resize", () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    });
  }, []);

  return <canvas id="canvas" className={styles.model}></canvas>;
};

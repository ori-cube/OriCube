"use client";

import React, { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import styles from "./index.module.scss";
import { Board, Procedure, CameraView } from "@/types/model";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { LineGeometry } from "three/examples/jsm/Addons.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Line2 } from "three/examples/jsm/Addons.js";
import { calculateOutlineAndBackColors } from "@/utils/modify-color";

type Props = {
  procedure: Procedure;
  color: string;
  foldAngle: number;
  procedureIndex: number;
  cameraView: CameraView;
};

export const Three: React.FC<Props> = ({
  procedure,
  color,
  foldAngle,
  procedureIndex,
  cameraView,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const contentGroupRef = useRef<THREE.Group | null>(null);

  // TODO: DBが修正されたらここは削除
  // procedureのtypeが存在しない場合、typeにBaseを設定
  if (!procedure[procedureIndex.toString()].type) {
    procedure[procedureIndex.toString()].type = "Base";
  }

  const stepObject = procedure[procedureIndex.toString()]; // 1ステップ分

  // 折り線の色と裏面の色を計算
  // TODO: ユーザー入力で任意で設定できるようにしたい
  const { outlineColor, backMaterialColor } = useMemo(
    () => calculateOutlineAndBackColors(color),
    []
  );

  // シーンの初期化
  useEffect(() => {
    if (sceneRef.current) return; // シーンが既に初期化されている場合は何もしない

    const canvas = canvasRef.current!;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const contentGroup = new THREE.Group();
    scene.add(contentGroup);
    contentGroupRef.current = contentGroup;

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    // 光源の設定
    // 環境光
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);
    // 直射光
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(-50, 100, 70);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 500;

    // 影カメラの撮影範囲を設定
    const shadowCam = dirLight.shadow.camera as THREE.OrthographicCamera;
    shadowCam.left = 300;
    shadowCam.right = -300;
    shadowCam.top = 150;
    shadowCam.bottom = -150;

    scene.add(dirLight);
    dirLight.target.position.set(0, 0, 0);
    scene.add(dirLight.target);

    // 床の設定
    const floor = new THREE.PlaneGeometry(200, 100);

    // 影用の床
    const shadowFloor = new THREE.Mesh(
      floor,
      new THREE.ShadowMaterial({ opacity: 0.25 }) // 影の濃さはopacityで調整
    );
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = -21;
    shadowFloor.receiveShadow = true;
    scene.add(shadowFloor);

    // 床が暗くならないように、影用の床の下に色付きの床を配置
    const baseFloor = new THREE.Mesh(
      floor,
      new THREE.MeshBasicMaterial({ color: 0xf5f5f5 })
    );
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -21.5;
    baseFloor.receiveShadow = false;
    scene.add(baseFloor);

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

  // カメラビュー切り替え
  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    const controls = controlsRef.current;

    // 目安距離（モデル中心から）
    switch (cameraView) {
      case "up":
        cam.position.set(0, 100, 0.001);
        break;
      case "down":
        cam.position.set(0, -100, 0.001);
        break;
      case "left":
        cam.position.set(-100, 70, 20);
        break;
      case "right":
        cam.position.set(100, 70, -20);
        break;
      case "back":
        cam.position.set(-20, 70, -100);
        break;
      default:
        cam.position.set(20, 70, 100);
        break;
    }
    cam.lookAt(new THREE.Vector3(0, 0, 0));
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [cameraView]);

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
      color: backMaterialColor,
      side: THREE.BackSide,
      transparent: true,
    });

    // 板や線のみクリアし、床や光源は残す
    const contentGroup = contentGroupRef.current;
    if (contentGroup) {
      while (contentGroup.children.length) {
        contentGroup.remove(contentGroup.children[0]);
      }
    }

    // そのままの板と、回転後の板を保持
    const boards: { points: Board; isMove: boolean }[] = [];
    stepObject.fixBoards.forEach((b) =>
      boards.push({ points: b, isMove: false })
    );
    const holds_line = [];
    const theta = THREE.MathUtils.degToRad(foldAngle);

    switch (stepObject.type) {
      case "Base":
        if (!stepObject.rotateAxis.length) return;
        // 通常の折り方の場合
        holds_line.push(
          new Float32Array([
            ...stepObject.rotateAxis[0],
            ...stepObject.rotateAxis[1],
          ])
        );
        const rotateAxis = new THREE.Vector3(...stepObject.rotateAxis[0])
          .sub(new THREE.Vector3(...stepObject.rotateAxis[1]))
          .normalize();
        const subNode = new THREE.Vector3(...stepObject.rotateAxis[0]);

        for (let i = 0; i < stepObject.moveBoards.length; i++) {
          const moveBoard = stepObject.moveBoards[i];
          const newBoard = moveBoard.map((point) => {
            const node = new THREE.Vector3(...point);
            const rotateNode = node.clone().sub(subNode);
            rotateNode.applyAxisAngle(rotateAxis, theta);
            rotateNode.add(subNode);
            return [rotateNode.x, rotateNode.y, rotateNode.z];
          });
          boards.push({ points: newBoard as Board, isMove: true });
        }

        break;
      case "convolution":
        const nodes = stepObject.nodes.concat();
        for (let i = 0; i < stepObject.moveNodesIdx.length; i++) {
          holds_line.push(
            new Float32Array([
              ...stepObject.rotateAxes[i][0],
              ...stepObject.rotateAxes[i][1],
            ])
          );
          const moveNode = new THREE.Vector3(
            ...nodes[stepObject.moveNodesIdx[i]]
          );
          const axis = new THREE.Vector3(...stepObject.rotateAxes[i][0])
            .sub(new THREE.Vector3(...stepObject.rotateAxes[i][1]))
            .normalize();
          const subNode = new THREE.Vector3(...stepObject.rotateAxes[i][0]);
          const rotateNode = moveNode.clone().sub(subNode);
          rotateNode.applyAxisAngle(axis, theta);
          rotateNode.add(subNode);
          nodes[stepObject.moveNodesIdx[i]] = [
            rotateNode.x,
            rotateNode.y,
            rotateNode.z,
          ];
        }
        for (let i = 0; i < stepObject.boards.length; i++) {
          const board = stepObject.boards[i];
          const newBoard = [];
          for (let j = 0; j < board.length; j++) {
            const node = new THREE.Vector3(...nodes[board[j]]);
            newBoard.push([node.x, node.y, node.z]);
          }
          boards.push({ points: newBoard as Board, isMove: true });
        }

        break;
      default:
        const _exhaustiveCheck: never = stepObject;
        return _exhaustiveCheck;
    }

    // 板を描画
    boards.forEach(({ points: board, isMove }) => {
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
      frontMesh.castShadow = true;
      backMesh.castShadow = true;
      contentGroup?.add(frontMesh);
      contentGroup?.add(backMesh);
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      // 頂点座標の配列を作成
      const positionAttr = edgesGeometry.getAttribute("position");
      const positions = new Float32Array(positionAttr.array);

      // LineGeometry にセット
      const lineGeometry = new LineGeometry();
      lineGeometry.setPositions(positions);

      // 枠線の設定
      const lineMaterial = new LineMaterial({
        color: 0x000000,
        linewidth: isMove ? 3 : 0.5,
        worldUnits: false,
        vertexColors: false,
      });
      // LineMaterial の解像度を設定
      lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

      // 枠線を描画
      const outline = new Line2(lineGeometry, lineMaterial);
      contentGroup?.add(outline);
    });

    // 折り目を描画
    holds_line.forEach((line) => {
      const geometry = new LineGeometry();
      geometry.setPositions(line);
      const lineMaterial = new LineMaterial({
        linewidth: 3,
        color: outlineColor.getHex(),
      });
      const lineMesh = new Line2(geometry, lineMaterial);
      contentGroup?.add(lineMesh);
    });
  }, [foldAngle, stepObject]);

  return <canvas ref={canvasRef} id="canvas" className={styles.model}></canvas>;
};

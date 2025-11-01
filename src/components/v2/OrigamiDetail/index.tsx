"use client";

import React, { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { Board, Procedure } from "@/types/model";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { LineGeometry } from "three/examples/jsm/Addons.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Line2 } from "three/examples/jsm/Addons.js";
import { calculateOutlineAndBackColors } from "@/utils/modify-color";

type CameraPreset = "front" | "angled";
type FloorOrientation = "vertical" | "parallel";

type Props = {
  procedure: Procedure;
  color: string;
  procedureIndex: number;
  cameraPreset?: CameraPreset;
  showShadow?: boolean;
  floorOrientation?: FloorOrientation;
  floorColor?: string;
  foldProgress?: number;
};

/**
 * トラックの特定の手順を表示するコンポーネント
 *
 * @description
 * - Three.jsを使用して折り紙の3Dアニメーションを描画
 * - 特定の手順を固定表示（手順の推移なし）
 * - カメラの回転・ズーム機能
 * - 影機能付き
 */
export const OrigamiDetailV2: React.FC<Props> = ({
  procedure,
  color,
  procedureIndex,
  cameraPreset = "angled",
  showShadow = true,
  floorOrientation = "vertical",
  floorColor = "#f5f5f5",
  foldProgress = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const contentGroupRef = useRef<THREE.Group | null>(null);
  const shadowFloorRef = useRef<THREE.Mesh | null>(null);
  const baseFloorRef = useRef<THREE.Mesh | null>(null);
  const baseFloorMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);

  const stepKey = procedureIndex.toString();
  const stepObject = procedure[stepKey];
  const clampedFoldProgress = useMemo(
    () => THREE.MathUtils.clamp(foldProgress, 0, 1),
    [foldProgress]
  );
  const foldAngle = useMemo(
    () => THREE.MathUtils.degToRad(180 * clampedFoldProgress),
    [clampedFoldProgress]
  );

  // procedureのtypeが存在しない場合、typeにBaseを設定
  if (!procedure[procedureIndex.toString()].type) {
    procedure[procedureIndex.toString()].type = "Base";
  }

  // 折り線の色と裏面の色を計算
  const { outlineColor, backMaterialColor } = useMemo(
    () => calculateOutlineAndBackColors(color),
    [color]
  );

  // シーンの初期化
  useEffect(() => {
    if (sceneRef.current) return;

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
    renderer.shadowMap.enabled = showShadow;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      40,
      sizes.width / sizes.height,
      10,
      1000
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);

    // 光源の設定
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(0, 100, 70);
    dirLight.castShadow = showShadow;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 500;

    const shadowCam = dirLight.shadow.camera as THREE.OrthographicCamera;
    shadowCam.left = 300;
    shadowCam.right = -300;
    shadowCam.top = 150;
    shadowCam.bottom = -150;

    scene.add(dirLight);
    dirLight.target.position.set(0, 0, 0);
    scene.add(dirLight.target);
    directionalLightRef.current = dirLight;

    // 床の設定
    const floor = new THREE.PlaneGeometry(200, 100);

    const shadowFloor = new THREE.Mesh(
      floor,
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = -21;
    shadowFloor.receiveShadow = showShadow;
    shadowFloor.visible = showShadow;
    scene.add(shadowFloor);
    shadowFloorRef.current = shadowFloor;

    const baseFloorMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(floorColor),
    });
    baseFloorMaterialRef.current = baseFloorMaterial;
    const baseFloor = new THREE.Mesh(floor, baseFloorMaterial);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -21.5;
    baseFloor.receiveShadow = false;
    baseFloor.visible = showShadow;
    scene.add(baseFloor);
    baseFloorRef.current = baseFloor;

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

  // カメラの初期位置を切り替え
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (cameraPreset === "front") {
      camera.position.set(0, 0, 100);
    } else {
      camera.position.set(20, 70, 100);
    }

    camera.lookAt(new THREE.Vector3(0, 0, 0));
    controls.target.set(0, 0, 0);
    controls.update();
  }, [cameraPreset]);

  // 影と床の有無を切り替え
  useEffect(() => {
    const renderer = rendererRef.current;
    const dirLight = directionalLightRef.current;
    const shadowFloor = shadowFloorRef.current;
    const baseFloor = baseFloorRef.current;

    if (renderer) {
      renderer.shadowMap.enabled = showShadow;
    }
    if (dirLight) {
      dirLight.castShadow = showShadow;
    }
    if (shadowFloor) {
      shadowFloor.visible = showShadow;
      shadowFloor.receiveShadow = showShadow;
    }
    if (baseFloor) {
      baseFloor.visible = showShadow;
    }
  }, [showShadow]);

  // 床の方向を切り替え
  useEffect(() => {
    if (!showShadow) return;
    const shadowFloor = shadowFloorRef.current;
    const baseFloor = baseFloorRef.current;
    if (!shadowFloor || !baseFloor) return;

    if (floorOrientation === "parallel") {
      shadowFloor.rotation.set(0, 0, 0);
      shadowFloor.position.set(0, 0, -1);
      baseFloor.rotation.set(0, 0, 0);
      baseFloor.position.set(0, 0, -2);
    } else {
      shadowFloor.rotation.set(-Math.PI / 2, 0, 0);
      shadowFloor.position.set(0, -21, 0);
      baseFloor.rotation.set(-Math.PI / 2, 0, 0);
      baseFloor.position.set(0, -21.5, 0);
    }
  }, [floorOrientation, showShadow]);

  // 床の色を更新
  useEffect(() => {
    const material = baseFloorMaterialRef.current;
    if (!material) return;
    material.color.set(floorColor);
  }, [floorColor]);

  // 手順を描画（固定表示）
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

    const contentGroup = contentGroupRef.current;
    if (contentGroup) {
      while (contentGroup.children.length) {
        contentGroup.remove(contentGroup.children[0]);
      }
    }

    const boards: { points: Board; isMove: boolean }[] = [];
    stepObject.fixBoards.forEach((b) =>
      boards.push({ points: b, isMove: false })
    );
    const holds_line = [];
    const theta = foldAngle;

    switch (stepObject.type) {
      case "Base":
        if (!stepObject.rotateAxis.length) return;

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
      frontMesh.castShadow = showShadow;
      backMesh.castShadow = showShadow;
      contentGroup?.add(frontMesh);
      contentGroup?.add(backMesh);
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      const positionAttr = edgesGeometry.getAttribute("position");
      const positions = new Float32Array(positionAttr.array);

      const lineGeometry = new LineGeometry();
      lineGeometry.setPositions(positions);

      const lineMaterial = new LineMaterial({
        color: 0x000000,
        linewidth: isMove ? 3 : 0.5,
        worldUnits: false,
        vertexColors: false,
      });
      lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

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
  }, [
    stepObject,
    color,
    outlineColor,
    backMaterialColor,
    showShadow,
    foldAngle,
  ]);

  return (
    <canvas
      ref={canvasRef}
      id="canvas"
      style={{ width: "100%", height: "100vh" }}
    ></canvas>
  );
};

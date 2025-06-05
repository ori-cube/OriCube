import styles from "./index.module.scss";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Board, RotateAxis } from "@/types/model";
import { rotateBoards } from "../../logics/rotateBoards";
import { FaCamera } from "react-icons/fa6";

type Props = {
  onClose: () => void;
  handleRegisterOrigami: () => void;
  origamiColor: string;
  foldBoards: Board[];
  notFoldBoards: Board[];
  // Current folding state parameters
  foldingAngle: number;
  rotateAxis: RotateAxis;
  numberOfMoveBoards: number;
  isFoldingDirectionFront: boolean;
  isMoveBoardsRight: boolean;
};

export const ShootingModal: React.FC<Props> = ({
  onClose,
  handleRegisterOrigami,
  origamiColor,
  foldBoards,
  notFoldBoards,
  foldingAngle,
  rotateAxis,
  numberOfMoveBoards,
  isFoldingDirectionFront,
  isMoveBoardsRight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleStartShooting = () => {
    handleRegisterOrigami();
    onClose();
  };

  // 3Dシーンの初期化
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const sizes = {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      40,
      sizes.width / sizes.height,
      10,
      1000
    );
    camera.position.set(0, 0, 120);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(camera);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Render loop
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    render();

    // Resize handler
    const handleResize = () => {
      const newSizes = {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      };
      camera.aspect = newSizes.width / newSizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(newSizes.width, newSizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, []);

  // 折り紙の描画
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    // シーンをクリア
    scene.clear();

    // カメラを再追加
    scene.add(camera);

    const frontMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(origamiColor),
      side: THREE.FrontSide,
      transparent: true,
    });
    const backMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#DFDFDF"),
      side: THREE.BackSide,
      transparent: true,
    });

    // Apply folding transformation if possible
    let transformedFoldBoards = foldBoards;
    if (rotateAxis.length === 2 && foldingAngle > 0) {
      // Apply the current folding state by rotating the boards
      // First, get the boards that should be rotated based on numberOfMoveBoards
      const { actualFoldBoards, actualNotFoldBoards } = getFoldAndNotFoldBoards(
        foldBoards,
        numberOfMoveBoards
      );

      // Apply rotation to the actual fold boards
      const rotatedBoards = rotateBoards({
        boards: actualFoldBoards,
        rotateAxis,
        angle: foldingAngle,
        isFoldingDirectionFront,
        isMoveBoardsRight,
      });

      // Combine all boards: notFoldBoards + actualNotFoldBoards + rotated boards
      transformedFoldBoards = [...actualNotFoldBoards, ...rotatedBoards];
    }

    // 全ての板を描画
    const allBoards = [...transformedFoldBoards, ...notFoldBoards];

    // バウンディングボックスを計算してカメラ位置を調整
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    allBoards.forEach((board) => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(board.flat());
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

      // バウンディングボックスを更新
      board.forEach((point) => {
        minX = Math.min(minX, point[0]);
        maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]);
        maxY = Math.max(maxY, point[1]);
        minZ = Math.min(minZ, point[2]);
        maxZ = Math.max(maxZ, point[2]);
      });

      // インデックスの作成
      const indices = [];
      for (let i = 1; i < board.length - 1; i++) {
        indices.push(0, i, i + 1);
      }
      geometry.setIndex(indices);

      const frontMesh = new THREE.Mesh(geometry, frontMaterial);
      const backMesh = new THREE.Mesh(geometry, backMaterial);
      scene.add(frontMesh);
      scene.add(backMesh);

      // エッジの描画
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({
        color: 0x000000,
        linewidth: 1,
      });
      const wireframe = new THREE.LineSegments(
        edgesGeometry,
        wireframeMaterial
      );
      scene.add(wireframe);
    });

    // オブジェクトの中心とサイズを計算
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;

    // 最大サイズに基づいてカメラ距離を決定
    const maxSize = Math.max(sizeX, sizeY, sizeZ);
    const distance = maxSize * 2.5; // オブジェクトサイズの2.5倍の距離

    // カメラ位置をオブジェクトの中心とサイズに基づいて調整
    camera.position.set(
      centerX + distance * 0.5,
      centerY + distance * 0.7,
      centerZ + distance
    );
    camera.lookAt(new THREE.Vector3(centerX, centerY, centerZ));

    // OrbitControlsのターゲットも調整
    if (controlsRef.current) {
      controlsRef.current.target.set(centerX, centerY, centerZ);
      controlsRef.current.update();
    }
  }, [
    origamiColor,
    foldBoards,
    notFoldBoards,
    foldingAngle,
    rotateAxis,
    numberOfMoveBoards,
    isFoldingDirectionFront,
    isMoveBoardsRight,
  ]);

  // Helper function to determine which boards to fold
  const getFoldAndNotFoldBoards = (
    moveBoards: Board[],
    numberOfMoveBoards: number
  ): { actualFoldBoards: Board[]; actualNotFoldBoards: Board[] } => {
    let xyPlaneBoards: Board[] = [];
    const notXyPlaneBoards: Board[] = [];

    for (let i = 0; i < moveBoards.length; i++) {
      const board = moveBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        xyPlaneBoards.push(board);
      } else {
        notXyPlaneBoards.push(board);
      }
    }

    // xy平面上の板をz座標が大きい順にソート
    xyPlaneBoards = xyPlaneBoards.sort((a, b) => b[0][2] - a[0][2]);

    const actualFoldBoards = [
      ...xyPlaneBoards.slice(0, numberOfMoveBoards),
      ...notXyPlaneBoards,
    ];
    const actualNotFoldBoards = xyPlaneBoards.slice(numberOfMoveBoards);

    return { actualFoldBoards, actualNotFoldBoards };
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.container}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <div className={styles.instructions}>
          好きな位置に回転・移動をせたら、撮影ボタンを押してください
        </div>
        <div className={styles.canvasContainer}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>
        <button className={styles.shootButton} onClick={handleStartShooting}>
          <FaCamera /> 撮影
        </button>
      </div>
    </div>
  );
};

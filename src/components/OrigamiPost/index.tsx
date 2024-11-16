"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./index.module.scss";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { separateBoard } from "./logics/separateBoard";
import { getAllIntersections } from "./logics/getAllIntersections";
import { isOnLeftSide } from "./logics/isOnLeftSide";
import { rotateBoards } from "./logics/rotateBoards";
import { renderBoard } from "./logics/renderBoard";
import { Point, Board } from "@/types/three";
import { FoldMethodControlPanel } from "./FoldMethodControlPanel";
import { Step } from "./FoldMethodControlPanel";

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

  const [fixBoards, setFixBoards] = useState<Board[]>([initialBoard]);
  const [moveBoards, setMoveBoards] = useState<Board[]>([]);
  const [rotateAxis, setRotateAxis] = useState<[Point, Point] | []>([]);

  const [foldingAngle, setFoldingAngle] = useState(0);
  const [numberOfMoveBoards, setNumberOfMoveBoards] = useState(1);

  const [selectedPoints, setSelectedPoints] = useState<Point[]>([]);
  const [inputStep, setInputStep] = useState<Step>("axis");

  // シーンの初期化
  useEffect(() => {
    const canvas = canvasRef.current!;
    let scene = sceneRef.current;
    let renderer = rendererRef.current;
    let camera = cameraRef.current;
    let controls = controlsRef.current;
    let raycaster = raycasterRef.current;

    if (!scene) {
      scene = new THREE.Scene();
    }
    sceneRef.current = scene;

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;
    }

    if (!camera) {
      camera = new THREE.PerspectiveCamera(
        40,
        sizes.width / sizes.height,
        10,
        1000
      );
      camera.position.set(0, 0, 100);
      camera.lookAt(new THREE.Vector3(0, 0, 0)); // モデルの中心を見るようにカメラの向きを設定
      scene.add(camera);
      cameraRef.current = camera;
    }

    if (!controls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;
    }

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };

    fixBoards.forEach((board) => renderBoard({ scene, board }));

    if (!raycaster) {
      raycaster = new THREE.Raycaster();
      raycasterRef.current = raycaster;
    }

    render();

    const resizeListener = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    window.addEventListener("resize", resizeListener);

    return () => {
      window.removeEventListener("resize", resizeListener);
    };
  }, [fixBoards]);

  // pointが追加されたとき
  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = sceneRef.current!;
    const renderer = rendererRef.current!;
    const camera = cameraRef.current!;
    const raycaster = raycasterRef.current!;

    const clickListener = (event: MouseEvent) => {
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Raycasterのセットアップ
      raycaster.setFromCamera(mouse, camera);

      // エッジに対してRaycasterを適用して交差を調べる
      const edges = scene.children.filter(
        (child) => child.type === "LineSegments"
      );
      const intersects = raycaster.intersectObjects(edges, true);

      if (intersects.length > 0) {
        const point = intersects[0].point; // 最初の交差点の座標を取得

        // 現在記録している点の数が2個未満の場合は、新しい点を追加, 2個以上の場合は最初の点を消して、新しい点を追加
        let newPoints = [...selectedPoints];

        if (selectedPoints.length < 2) {
          newPoints.push([point.x, point.y, point.z]);
        } else {
          newPoints = newPoints.slice(1);
          newPoints.push([point.x, point.y, point.z]);
        }

        // 既存のpointを削除する
        scene.children = scene.children.filter(
          (child) => child.name !== "Point"
        );
        // pointsを描画し直す
        newPoints.forEach((point) => {
          const geometry = new THREE.SphereGeometry(1, 32, 32).scale(
            0.7,
            0.7,
            0.7
          );
          const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
          const pointMesh = new THREE.Mesh(geometry, material);
          pointMesh.position.set(point[0], point[1], point[2]);
          pointMesh.name = "Point";
          scene.add(pointMesh);
        });
        setSelectedPoints(newPoints);

        renderer.render(scene, camera);
      }
    };

    canvas.addEventListener("click", clickListener);

    return () => {
      canvas.removeEventListener("click", clickListener);
    };
  }, [selectedPoints]);

  const handleDecideRotateAxis = (scene: THREE.Scene) => {
    if (selectedPoints.length < 2) return window.alert("2点を選択してください");

    const axis: [Point, Point] = [
      [...selectedPoints[0]],
      [...selectedPoints[1]],
    ];

    let leftBoards: Board[] = [];
    let rightBoards: Board[] = [];

    fixBoards.forEach((board) => {
      const intersections = getAllIntersections({
        board,
        rotateAxis: axis,
      });
      if (intersections.length === 2) {
        // 板を分割する場合
        const separatedBoard = separateBoard({
          board,
          rotateAxis: axis,
        });
        if (!separatedBoard) return alert("Failed to separate board.");
        const { leftBoard, rightBoard } = separatedBoard;
        leftBoards.push(leftBoard);
        rightBoards.push(rightBoard);
      } else {
        // 板を分割しない場合
        // 板が回転軸の左側にあるか、右側にあるかを判定
        // TODO: 一部分だけ回転軸の左右にある場合はエラーになる。

        const isLeftSide = board.map((point) =>
          isOnLeftSide({
            point,
            axis1: axis[0],
            axis2: axis[1],
          })
        );

        const isAllLeft = isLeftSide.every((b) => b);
        const isAllRight = isLeftSide.every((b) => !b);

        if (isAllLeft) {
          leftBoards.push(board);
        } else if (isAllRight) {
          rightBoards.push(board);
        } else {
          console.log("板が回転軸の左右にまたがっている");
        }
      }
    });

    // rightBoardsのz座標にすべて+0.001する。板の重なりを避けるため
    rightBoards = rightBoards.map((board) =>
      board.map((point) => [point[0], point[1], point[2] + 0.001])
    );

    // sceneから板、線を削除
    scene.children = scene.children.filter(
      (child) => child.type !== "Mesh" && child.type !== "LineSegments"
    );
    // pointを削除する
    scene.children = scene.children.filter((child) => child.type !== "Points");

    setFixBoards(leftBoards);
    setMoveBoards(rightBoards);
    setRotateAxis(axis);
    setSelectedPoints([]);
    setInputStep("target");
    leftBoards.forEach((board) => renderBoard({ scene, board }));
    rightBoards.forEach((board) => renderBoard({ scene, board }));
  };

  // 回転に応じて板を描画
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rotateAxis.length === 0) return;
    if (moveBoards.length === 0) return;

    // TODO: 共通化する
    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
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

    const foldBoards = [
      ...xyPlaneBoards.slice(0, numberOfMoveBoards),
      ...notXyPlaneBoards,
    ];
    const notFoldBoards = xyPlaneBoards.slice(numberOfMoveBoards);

    const rotatedBoards = rotateBoards({
      boards: foldBoards,
      rotateAxis,
      angle: foldingAngle,
    });
    const boards = [...fixBoards, ...rotatedBoards, ...notFoldBoards];

    // 前の板を削除
    scene.children = scene.children.filter((child) => child.type === "Line");
    // 板を描画
    boards.forEach((board) => {
      renderBoard({ scene, board });
    });
  }, [foldingAngle, fixBoards, moveBoards, rotateAxis, numberOfMoveBoards]);

  const handleDecideBoards = () => {
    // moveBoardsを回転した後の板を、fixBoardsに追加する
    if (moveBoards.length === 0) return;
    if (rotateAxis.length === 0) return;

    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
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

    const foldBoards = [
      ...xyPlaneBoards.slice(0, numberOfMoveBoards),
      ...notXyPlaneBoards,
    ];
    const notFoldBoards = xyPlaneBoards.slice(numberOfMoveBoards);

    const rotatedBoards = rotateBoards({
      boards: foldBoards,
      rotateAxis,
      angle: foldingAngle,
    });
    const boards = [...fixBoards, ...rotatedBoards, ...notFoldBoards];

    // boardsの格値を少数第3位までにする
    // これをしないとe^-16のような値が出てきて、板が重なっているかどうかの判定がうまくいかない
    const roundedBoards = boards.map((board) =>
      board.map(
        (point) => point.map((v) => Math.round(v * 1000) / 1000) as Point
      )
    );

    setFixBoards(roundedBoards);
    setMoveBoards([]);
    setRotateAxis([]);
    setFoldingAngle(0);
  };

  const handleChangeNumberOfMoveBoards = () => {
    const filteredBoards = moveBoards.filter((board) =>
      board.every((point) => point[2] === board[0][2])
    );
    setNumberOfMoveBoards((prev) => (prev + 1) % (filteredBoards.length + 1));
  };

  return (
    <>
      <canvas ref={canvasRef} id="canvas" className={styles.model} />
      <div className={styles.panelContainer}>
        <FoldMethodControlPanel
          handleDecideRotateAxis={() =>
            handleDecideRotateAxis(sceneRef.current!)
          }
          currentStep={inputStep}
        />
      </div>
    </>
  );
};

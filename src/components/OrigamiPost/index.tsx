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
import { renderPoint } from "./logics/renderPoint";
import { LineGeometry } from "three/examples/jsm/Addons.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Line2 } from "three/examples/jsm/Addons.js";
import { Procedure, Model } from "@/types/model";
import { insertData } from "@/utils/upload-data";
import { useSession } from "next-auth/react";
import { NameAndColorControlPanel } from "./NameAndColorControlPanel";

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

  const [selectedPoints, setSelectedPoints] = useState<Point[]>([]);
  const [inputStep, setInputStep] = useState<Step>("axis");

  const [isMoveBoardsRight, setIsMoveBoardsRight] = useState(true);
  const [leftBoards, setLeftBoards] = useState<Board[]>([]);
  const [rightBoards, setRightBoards] = useState<Board[]>([]);

  const [foldingAngle, setFoldingAngle] = useState(180);
  const [numberOfMoveBoards, setNumberOfMoveBoards] = useState(0);
  const [isFoldingDirectionFront, setIsFoldingDirectionFront] = useState(true);

  const [procedureIndex, setProcedureIndex] = useState(1);
  const [procedure, setProcedure] = useState<Procedure>({});

  const [origamiName, setOrigamiName] = useState("hugahuga");
  const [origamiColor, setOrigamiColor] = useState("#FFD700");

  const { data: session } = useSession();

  const sizes = {
    width: window.innerWidth - 320,
    height: window.innerHeight,
  };

  // シーンの初期化
  useEffect(() => {
    if (inputStep !== "axis") return;
    const canvas = canvasRef.current!;
    const scene = new THREE.Scene();
    let renderer = rendererRef.current;
    let camera = cameraRef.current;
    let controls = controlsRef.current;
    let raycaster = raycasterRef.current;

    sceneRef.current = scene;

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

    selectedPoints.forEach((point) => renderPoint({ scene, point }));
    fixBoards.forEach((board) => renderBoard({ scene, board }));

    if (!raycaster) {
      raycaster = new THREE.Raycaster();
      raycasterRef.current = raycaster;
    }

    render();

    const resizeListener = () => {
      sizes.width = window.innerWidth - 320;
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
  }, [fixBoards, inputStep]);

  // pointが追加されたとき
  useEffect(() => {
    if (inputStep !== "axis") return;
    const canvas = canvasRef.current!;
    const scene = sceneRef.current!;
    const renderer = rendererRef.current!;
    const camera = cameraRef.current!;
    const raycaster = raycasterRef.current!;

    console.log("procedure", procedure);

    const clickListener = (event: MouseEvent) => {
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

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
          renderPoint({ scene, point });
        });
        setSelectedPoints(newPoints);

        renderer.render(scene, camera);
      }
    };

    canvas.addEventListener("click", clickListener);

    return () => {
      canvas.removeEventListener("click", clickListener);
    };
  }, [selectedPoints, inputStep]);

  const handleDecideRotateAxis = (scene: THREE.Scene) => {
    if (selectedPoints.length < 2) return window.alert("2点を選択してください");

    const axis: [Point, Point] = [
      [...selectedPoints[0]],
      [...selectedPoints[1]],
    ];

    let lefts: Board[] = [];
    let rights: Board[] = [];

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
        lefts.push(leftBoard);
        rights.push(rightBoard);
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
          lefts.push(board);
        } else if (isAllRight) {
          rights.push(board);
        } else {
          console.log("板が回転軸の左右にまたがっている");
        }
      }
    });
    // sceneから板、線を削除
    scene.children = scene.children.filter(
      (child) => child.type !== "Mesh" && child.type !== "LineSegments"
    );
    // pointを削除する
    scene.children = scene.children.filter((child) => child.type !== "Points");

    // 折り線を描画
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([
      axis[0][0],
      axis[0][1],
      axis[0][2],
      axis[1][0],
      axis[1][1],
      axis[1][2],
    ]);
    const lineMaterial = new LineMaterial({
      color: 0xff00ff,
      linewidth: 3,
    });
    const lineMesh = new Line2(lineGeometry, lineMaterial);
    lineMesh.name = "Axis";
    console.log(lineMesh.name);
    scene.add(lineMesh);

    setRotateAxis(axis);
    setInputStep("target");
    lefts.forEach((board) => renderBoard({ scene, board }));
    rights.forEach((board) => renderBoard({ scene, board }));
    setLeftBoards(lefts);
    setRightBoards(rights);
  };

  const handleCancelRotateAxis = () => {
    console.log("cancel");
    setRotateAxis([]);
    // TODO: 状態を保持しておいて、一個前の状態に戻すようにする
    setFixBoards([initialBoard]);
    setMoveBoards([]);
    setInputStep("axis");
  };

  // 板を折る対象を決定する関数
  useEffect(() => {
    if (inputStep !== "target") return;
    if (rotateAxis.length === 0) return;
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Raycasterのセットアップ
    raycasterRef.current = new THREE.Raycaster();
    const raycaster = raycasterRef.current;

    if (!canvas || !scene || !camera) return;

    const hoverListener = (event: MouseEvent) => {
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      console.log(scene.children);
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const firstIntersect = intersects[0].object;
        if (firstIntersect.type === "Mesh") {
          firstIntersect.material.color.set(0x000000);
          scene.children.forEach((child) => {
            if (child.type === "Mesh" && child !== firstIntersect) {
              if (child.material.side === THREE.FrontSide) {
                child.material.color.set("red");
              } else {
                child.material.color.set("#DFDFDF");
              }
            }
          });
        } else {
          scene.children.forEach((child) => {
            if (child.type === "Mesh") {
              if (child.material.side === THREE.FrontSide) {
                child.material.color.set("red");
              } else {
                child.material.color.set("#DFDFDF");
              }
            }
          });
        }
      }
    };

    canvas.addEventListener("mousemove", hoverListener);

    const clickListener = (event: MouseEvent) => {
      // クリックしたオブジェクトを取得
      // そいつが軸の右か左かを判定 isOnLeftSideを使う
      // isMoveBoardsRightを変更する
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const point = intersects[0].point;

        const isTargetLeft = isOnLeftSide({
          point: [point.x, point.y, point.z],
          axis1: rotateAxis[0],
          axis2: rotateAxis[1],
        });

        setIsMoveBoardsRight(!isTargetLeft);

        // TODO：板を選択中の表示に変える
      }
    };

    canvas.addEventListener("click", clickListener);

    return () => {
      canvas.removeEventListener("mousemove", hoverListener);
      canvas.removeEventListener("click", clickListener);
    };
  }, [inputStep]);

  const handleDecideFoldTarget = () => {
    // ここで、moveBoardsとfixBoardsに振り分ける
    if (isMoveBoardsRight) {
      setMoveBoards(rightBoards);
      setFixBoards(leftBoards);
    } else {
      setMoveBoards(leftBoards);
      setFixBoards(rightBoards);
    }

    setInputStep("fold");
  };

  // rightBoardsのz座標にすべて+0.001する。板の重なりを避けるため
  // TODO: ここは確定したステップでやること
  // rightBoards = rightBoards.map((board) =>
  //   board.map((point) => [point[0], point[1], point[2] + 0.001])
  // );

  // 手前に折るか、奥に折るかを決める関数
  // 手前に折る場合、moveBoardsのz座標に+0.001し、奥に折る場合はz座標に-0.001する
  // また、1回押すごとにnumberOfMoveBoardsに1を足す
  let tmpBoards = isMoveBoardsRight ? rightBoards : leftBoards;
  const maxNumberOfMoveBoards = tmpBoards.filter((board) =>
    board.every((point) => point[2] === board[0][2])
  ).length;

  const handleFoldFrontSide = () => {
    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    let xyPlaneBoards: Board[] = [];
    const notXyPlaneBoards: Board[] = [];

    const targetBoards = isMoveBoardsRight ? rightBoards : leftBoards;
    const maxNumberOfMoveBoards = targetBoards.filter((board) =>
      board.every((point) => point[2] === board[0][2])
    ).length;
    const number = !isFoldingDirectionFront
      ? 1
      : (numberOfMoveBoards + 1) % (maxNumberOfMoveBoards + 1);
    for (let i = 0; i < targetBoards.length; i++) {
      const board = targetBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        xyPlaneBoards.push(board);
      } else {
        notXyPlaneBoards.push(board);
      }
    }

    // xy平面上の板をz座標が大きい順にソート
    xyPlaneBoards = xyPlaneBoards.sort((a, b) => b[0][2] - a[0][2]);

    // foldXyPlaneBoardsの、上からumber枚にz座標を+0.001する
    const foldXyPlaneBoards = xyPlaneBoards
      .slice(0, number)
      .map(
        (board) =>
          board.map((point) => [point[0], point[1], point[2] + 0.001]) as Board
      );

    const foldBoards = [...foldXyPlaneBoards, ...notXyPlaneBoards];
    const notFoldBoards = xyPlaneBoards.slice(number);

    setMoveBoards(foldBoards);
    setFixBoards([
      ...(isMoveBoardsRight ? leftBoards : rightBoards),
      ...notFoldBoards,
    ]);
    setNumberOfMoveBoards(number);
    setIsFoldingDirectionFront(true);
  };

  const handleFoldBackSide = () => {
    // xy平面上の板のうち、z座標が大きい順に、numberOfMoveBoards枚を折る
    // それ以外の板は無条件で折る
    let xyPlaneBoards: Board[] = [];
    const notXyPlaneBoards: Board[] = [];

    const targetBoards = isMoveBoardsRight ? rightBoards : leftBoards;
    const maxNumberOfMoveBoards = targetBoards.filter((board) =>
      board.every((point) => point[2] === board[0][2])
    ).length;
    const number = isFoldingDirectionFront
      ? 1
      : (numberOfMoveBoards + 1) % (maxNumberOfMoveBoards + 1);
    for (let i = 0; i < targetBoards.length; i++) {
      const board = targetBoards[i];
      const isEquallyZ = board.every((point) => point[2] === board[0][2]);
      if (isEquallyZ) {
        xyPlaneBoards.push(board);
      } else {
        notXyPlaneBoards.push(board);
      }
    }

    // xy平面上の板をz座標が小さい順にソート
    xyPlaneBoards = xyPlaneBoards.sort((a, b) => a[0][2] - b[0][2]);

    // foldXyPlaneBoardsの、下からnumber枚にz座標を-0.001する
    const foldXyPlaneBoards = xyPlaneBoards
      .slice(0, number)
      .map(
        (board) =>
          board.map((point) => [point[0], point[1], point[2] - 0.001]) as Board
      );

    const foldBoards = [...foldXyPlaneBoards, ...notXyPlaneBoards];
    const notFoldBoards = xyPlaneBoards.slice(number);

    setMoveBoards(foldBoards);
    setFixBoards([
      ...(isMoveBoardsRight ? leftBoards : rightBoards),
      ...notFoldBoards,
    ]);
    setNumberOfMoveBoards(number);
    setIsFoldingDirectionFront(false);
  };

  // 回転に応じて板を描画
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (inputStep !== "fold") return;
    if (rotateAxis.length === 0) return;

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
      isFoldingDirectionFront: isFoldingDirectionFront,
    });
    const boards = [...fixBoards, ...rotatedBoards, ...notFoldBoards];

    // 前の板を削除
    scene.children = scene.children.filter((child) => {
      console.log(child.name);
      return child.name === "Axis";
    });
    // 板を描画
    boards.forEach((board) => {
      renderBoard({ scene, board });
    });
  }, [foldingAngle, fixBoards, moveBoards, rotateAxis, numberOfMoveBoards]);

  const handleDecideFoldMethod = () => {
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

    // Procedureを作成する
    const newProcedure = {
      description: "hugahuga",
      fixBoards: [...fixBoards, notFoldBoards],
      moveBoards: foldBoards,
      rotateAxis: rotateAxis,
    };

    const rotatedBoards = rotateBoards({
      boards: foldBoards,
      rotateAxis,
      angle: foldingAngle,
      isFoldingDirectionFront: isFoldingDirectionFront,
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
    setFoldingAngle(180);
    setSelectedPoints([]);
    setInputStep("axis");
    setNumberOfMoveBoards(0);
    setProcedureIndex(procedureIndex + 1);
    setProcedure({ ...procedure, [procedureIndex]: newProcedure });
  };

  const handleRegisterOrigami = () => {
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

    // Procedureを作成する
    const newProcedure = {
      description: "hugahuga",
      fixBoards: [...fixBoards, notFoldBoards],
      moveBoards: foldBoards,
      rotateAxis: rotateAxis,
    };

    const procedures = { ...procedure, [procedureIndex]: newProcedure };

    const model: Model = {
      name: origamiName,
      color: origamiColor,
      procedure: procedures,
    };

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) {
      console.error("Failed to register origami.");
      return;
    }

    renderer.render(scene, camera);

    renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "model.png", { type: "image/png" });
      insertData(file, session, model);
    });
  };

  const handleCancelFoldTarget = () => {
    setMoveBoards([]);
    setFixBoards([initialBoard]);
    setInputStep("axis");
  };

  return (
    <>
      <canvas ref={canvasRef} id="canvas" className={styles.model} />
      <div className={styles.namePanelContainer}>
        <NameAndColorControlPanel />
      </div>
      <div className={styles.panelContainer}>
        <FoldMethodControlPanel
          handleDecideRotateAxis={() =>
            handleDecideRotateAxis(sceneRef.current!)
          }
          handleCancelRotateAxis={handleCancelRotateAxis}
          handleDecideFoldTarget={handleDecideFoldTarget}
          handleCancelFoldTarget={handleCancelFoldTarget}
          handleFoldFrontSide={handleFoldFrontSide}
          handleFoldBackSide={handleFoldBackSide}
          foldAngle={foldingAngle}
          setFoldAngle={setFoldingAngle}
          handleDecideFoldMethod={handleDecideFoldMethod}
          currentStep={inputStep}
          totalNumber={maxNumberOfMoveBoards}
          currentNumber={numberOfMoveBoards}
          isFoldFrontSide={isFoldingDirectionFront}
          handleRegisterOrigami={handleRegisterOrigami}
        />
      </div>
    </>
  );
};

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
import { redirect } from "next/navigation";
import Popup from "./Popup";

export const OrigamiPost = () => {
  const initialBoard: Board = [
    [20, 20, 0],
    [-20, 20, 0],
    [-20, -20, 0],
    [20, -20, 0],
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

  const [origamiName, setOrigamiName] = useState("");
  // TODO: STEP2で色の変更が反映されない
  const [origamiColor, setOrigamiColor] = useState("#ff0000");
  const [origamiDescription, setOrigamiDescription] = useState("");

  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const { data: session } = useSession();

  // シーンの初期化
  useEffect(() => {
    const sizes = {
      width: window.innerWidth - 320,
      height: window.innerHeight,
    };
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
      camera.position.set(0, 0, 120);
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
    fixBoards.forEach((board) =>
      renderBoard({ scene, board, color: origamiColor })
    );

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
  }, [fixBoards, inputStep, origamiColor, popup]);

  // pointが追加されたとき
  useEffect(() => {
    const sizes = {
      width: window.innerWidth - 320,
      height: window.innerHeight,
    };
    if (inputStep !== "axis") return;
    const canvas = canvasRef.current!;
    const scene = sceneRef.current!;
    const renderer = rendererRef.current!;
    const camera = cameraRef.current!;
    const raycaster = raycasterRef.current!;

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
  }, [selectedPoints, inputStep, popup]);

  const handleDecideRotateAxis = (scene: THREE.Scene) => {
    if (selectedPoints.length < 2)
      return console.error("点が2つ選択されていません");

    const axis: [Point, Point] = [
      [...selectedPoints[0]],
      [...selectedPoints[1]],
    ];

    const lefts: Board[] = [];
    const rights: Board[] = [];

    for (let i = 0; i < fixBoards.length; i++) {
      const board = fixBoards[i];
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
          return setPopup({
            message: "板が回転軸の左右にまたがっているため、分割できません。",
            type: "error",
          });
        }
      }
    }
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
    scene.add(lineMesh);

    setRotateAxis(axis);
    setInputStep("target");
    lefts.forEach((board) =>
      renderBoard({ scene, board, color: origamiColor })
    );
    rights.forEach((board) =>
      renderBoard({ scene, board, color: origamiColor })
    );

    console.log("lefts", lefts);
    console.log("rights", rights);
    setLeftBoards(lefts);
    setRightBoards(rights);
  };

  const handleCancelRotateAxis = () => {
    setRotateAxis([]);
    // TODO: 状態を保持しておいて、一個前の状態に戻すようにする
    setFixBoards([initialBoard]);
    setMoveBoards([]);
    setInputStep("axis");
  };

  // 板を折る対象を決定する関数
  useEffect(() => {
    const sizes = {
      width: window.innerWidth - 320,
      height: window.innerHeight,
    };
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
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        const firstIntersect = intersects[0].object;
        if (firstIntersect.type === "Mesh") {
          const mesh = firstIntersect as THREE.Mesh;
          const edges = Array.from(mesh.geometry.attributes.position.array);
          const firstVertex = edges.slice(0, 3);
          edges.push(...firstVertex);
          const lineGeometry = new LineGeometry();
          lineGeometry.setPositions(edges);
          const lineMaterial = new LineMaterial({
            color: 0x009dff,
            linewidth: 3,
          });
          const line = new Line2(lineGeometry, lineMaterial);
          line.name = "Border";
          scene.add(line);
        } else {
          scene.children = scene.children.filter(
            (child) => child.name !== "Border"
          );
        }
      } else {
        scene.children = scene.children.filter(
          (child) => child.name !== "Border"
        );
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

        scene.children = scene.children.filter(
          (child) => child.name !== "SelectedBorder"
        );

        if (isTargetLeft) {
          // leftBoardsのそれぞれの板にBoarderを描画
          leftBoards.forEach((board) => {
            const edges = Array.from(board.flat());
            const firstVertex = edges.slice(0, 3);
            edges.push(...firstVertex);
            const lineGeometry = new LineGeometry();
            lineGeometry.setPositions(edges);
            const lineMaterial = new LineMaterial({
              color: 0x4400ff,
              linewidth: 3,
            });
            const line = new Line2(lineGeometry, lineMaterial);
            line.name = "SelectedBorder";
            scene.add(line);
          });
        } else {
          rightBoards.forEach((board) => {
            const edges = Array.from(board.flat());
            const firstVertex = edges.slice(0, 3);
            edges.push(...firstVertex);
            const lineGeometry = new LineGeometry();
            lineGeometry.setPositions(edges);
            const lineMaterial = new LineMaterial({
              color: 0x4400ff,
              linewidth: 3,
            });
            const line = new Line2(lineGeometry, lineMaterial);
            line.name = "SelectedBorder";
            scene.add(line);
          });
        }
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
  const tmpBoards = isMoveBoardsRight ? rightBoards : leftBoards;
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
      isMoveBoardsRight,
    });
    const boards = [...fixBoards, ...rotatedBoards, ...notFoldBoards];

    // 前の板を削除
    scene.children = scene.children.filter((child) => {
      return child.name === "Axis";
    });
    // 板を描画
    boards.forEach((board) => {
      renderBoard({ scene, board, color: origamiColor });
    });
  }, [
    foldingAngle,
    fixBoards,
    moveBoards,
    rotateAxis,
    numberOfMoveBoards,
    origamiColor,
  ]);

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

    // rotateAxisをソートする。
    let sortedRotateAxis = rotateAxis;
    if (isMoveBoardsRight) {
      sortedRotateAxis =
        rotateAxis[0][0] < rotateAxis[1][0]
          ? rotateAxis
          : [rotateAxis[1], rotateAxis[0]];
    } else {
      sortedRotateAxis =
        rotateAxis[0][0] > rotateAxis[1][0]
          ? rotateAxis
          : [rotateAxis[1], rotateAxis[0]];
    }

    let z = 0;
    //  回転軸の2つのz座標の差の絶対値が0.01以下の場合、z座標を一番大きい板のz座標に合わせる
    if (Math.abs(sortedRotateAxis[0][2] - sortedRotateAxis[1][2]) < 0.01) {
      for (let i = 0; i < foldBoards.length; i++) {
        const board = foldBoards[i];
        const isEquallyZ = board.every((point) => point[2] === board[0][2]);
        if (isEquallyZ) {
          if (isFoldingDirectionFront) {
            if (z === undefined || board[0][2] > z) {
              z = board[0][2];
            }
          } else {
            if (z === undefined || board[0][2] < z) {
              z = board[0][2];
            }
          }
        }
      }
    }

    // sortedRotateAxisのz座標にzを加える
    sortedRotateAxis = sortedRotateAxis.map((point) => {
      return [point[0], point[1], point[2] + z];
    }) as [Point, Point];

    console.log("sortedRotateAxis");

    // isFoldingDirectionFrontがfalseなら、sortedRotateAxisの順序を逆にする
    if (isFoldingDirectionFront === false) {
      sortedRotateAxis = [sortedRotateAxis[1], sortedRotateAxis[0]];
    }

    // Procedureを作成する
    const newProcedure = {
      description: origamiDescription,
      fixBoards: [...fixBoards, notFoldBoards],
      moveBoards: foldBoards,
      rotateAxis: sortedRotateAxis,
    };

    const rotatedBoards = rotateBoards({
      boards: foldBoards,
      rotateAxis,
      angle: foldingAngle,
      isFoldingDirectionFront: isFoldingDirectionFront,
      isMoveBoardsRight,
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

    if (rotateAxis.length === 0) return;
    // rotateAxisをソート
    let sortedRotateAxis = rotateAxis;
    if (isMoveBoardsRight) {
      sortedRotateAxis =
        rotateAxis[0][0] < rotateAxis[1][0]
          ? rotateAxis
          : [rotateAxis[1], rotateAxis[0]];
    } else {
      sortedRotateAxis =
        rotateAxis[0][0] > rotateAxis[1][0]
          ? rotateAxis
          : [rotateAxis[1], rotateAxis[0]];
    }

    console.log("foldBoards", foldBoards);

    let z = 0;
    //  回転軸の2つのz座標の差の絶対値が0.01以下の場合、z座標を一番大きい板のz座標に合わせる
    if (Math.abs(sortedRotateAxis[0][2] - sortedRotateAxis[1][2]) < 0.01) {
      for (let i = 0; i < foldBoards.length; i++) {
        const board = foldBoards[i];
        const isEquallyZ = board.every((point) => point[2] === board[0][2]);
        if (isEquallyZ) {
          if (isFoldingDirectionFront) {
            if (z === undefined || board[0][2] > z) {
              z = board[0][2];
            }
          } else {
            if (z === undefined || board[0][2] < z) {
              z = board[0][2];
            }
          }
        }
      }
    }

    // sortedRotateAxisのz座標にzを加える
    sortedRotateAxis = sortedRotateAxis.map((point) => {
      return [point[0], point[1], point[2] + z];
    }) as [Point, Point];

    // isFoldingDirectionFrontがfalseなら、sortedRotateAxisの順序を逆にする
    if (isFoldingDirectionFront === false) {
      sortedRotateAxis = [sortedRotateAxis[1], sortedRotateAxis[0]];
    }

    // Procedureを作成する
    const newProcedure = {
      description: origamiDescription,
      fixBoards: [...fixBoards, notFoldBoards],
      moveBoards: foldBoards,
      rotateAxis: sortedRotateAxis,
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
      setPopup({ message: "データ送信中です", type: "info" });
      insertData(file, session, model).then(() => {
        setPopup({ message: "データの挿入に成功しました！", type: "success" });
        setTimeout(() => {
          redirect("/");
        }, 1500);
      });
    });
  };

  const handleClosePopup = () => {
    setPopup(null);
  };

  const handleCancelFoldTarget = () => {
    setMoveBoards([]);
    setFixBoards([initialBoard]);
    setInputStep("axis");
  };

  const handleOrigamiNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrigamiName(e.target.value);
  };

  const handleOrigamiColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrigamiColor(e.target.value);
  };

  return (
    <>
      <canvas ref={canvasRef} id="canvas" className={styles.model} />
      <div className={styles.namePanelContainer}>
        <NameAndColorControlPanel
          name={origamiName}
          handleNameChange={handleOrigamiNameChange}
          color={origamiColor}
          handleColorChange={handleOrigamiColorChange}
        />
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
          origamiDescription={origamiDescription}
          setOrigamiDescription={setOrigamiDescription}
        />
      </div>
      {popup && (
        <Popup
          message={popup.message}
          type={popup.type}
          onClose={handleClosePopup}
        />
      )}
    </>
  );
};

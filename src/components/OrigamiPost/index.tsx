"use client";

import React, { useRef, useState } from "react";
import styles from "./index.module.scss";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { rotateBoards } from "./logics/rotateBoards";
import { Point, Board } from "@/types/three";
import { FoldMethodControlPanel } from "./FoldMethodControlPanel";
import { Step } from "./FoldMethodControlPanel";
import { Procedure, Model } from "@/types/model";
import { insertData } from "@/utils/upload-data";
import { useSession } from "next-auth/react";
import { NameAndColorControlPanel } from "./NameAndColorControlPanel";
import { redirect } from "next/navigation";
import Popup from "./Popup";
import { useInitScene } from "./hooks/useInitScene";
import { useSelectPoints } from "./hooks/useSelectPoints";
import { useDecideRotateAxis } from "./hooks/useDecideRotateAxis";
import { useDecideTargetBoard } from "./hooks/useDecideTargetBoard";
import { useSelectSideAndNumberOfBoards } from "./hooks/useSelectSideAndNumberOfBoards";
import { useRotateBoards } from "./hooks/useRotateBoards";

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

  const [inputStep, setInputStep] = useState<Step>("axis");
  const [fixBoards, setFixBoards] = useState<Board[]>([initialBoard]);
  const [moveBoards, setMoveBoards] = useState<Board[]>([]);

  const [foldingAngle, setFoldingAngle] = useState(180);

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
  useInitScene({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    raycasterRef,
    fixBoards,
    inputStep,
    origamiColor,
  });

  // 折り線の点の選択
  const { selectedPoints } = useSelectPoints({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    inputStep,
  });

  // 回転軸を決定
  const {
    handleDecideRotateAxis,
    handleCancelRotateAxis,
    leftBoards,
    rightBoards,
    rotateAxis,
  } = useDecideRotateAxis({
    selectedPoints,
    fixBoards,
    setInputStep,
    origamiColor,
  });

  // 板を折る対象を決定する関数
  const { handleDecideFoldTarget, isMoveBoardsRight } = useDecideTargetBoard({
    setInputStep,
    inputStep,
    rotateAxis,
    leftBoards,
    rightBoards,
    canvasRef,
    sceneRef,
    cameraRef,
    raycasterRef,
  });

  const {
    handleFoldFrontSide,
    handleFoldBackSide,
    numberOfMoveBoards,
    maxNumberOfMoveBoards,
    isFoldingDirectionFront,
  } = useSelectSideAndNumberOfBoards({
    isMoveBoardsRight,
    leftBoards,
    rightBoards,
    setFixBoards,
    setMoveBoards,
  });

  // 回転に応じて板を描画
  useRotateBoards({
    sceneRef,
    inputStep,
    rotateAxis,
    foldingAngle,
    isFoldingDirectionFront,
    numberOfMoveBoards,
    isMoveBoardsRight,
    moveBoards,
    fixBoards,
    origamiColor,
  });

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
    // setRotateAxis([]);
    setFoldingAngle(180);
    // setSelectedPoints([]);
    setInputStep("axis");
    // setNumberOfMoveBoards(0);
    setProcedureIndex(procedureIndex + 1);
    setProcedure({ ...procedure, [procedureIndex]: newProcedure });
    setOrigamiDescription("");
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

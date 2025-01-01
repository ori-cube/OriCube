"use client";

import React, { useRef, useState } from "react";
import styles from "./index.module.scss";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Board } from "@/types/three";
import { FoldMethodControlPanel } from "./FoldMethodControlPanel";
import { Step } from "./FoldMethodControlPanel";
import { Procedure } from "@/types/model";
import { NameAndColorControlPanel } from "./NameAndColorControlPanel";
import Popup from "./Popup";
import { useInitScene } from "./hooks/useInitScene";
import { useSelectPoints } from "./hooks/useSelectPoints";
import { useDecideRotateAxis } from "./hooks/useDecideRotateAxis";
import { useDecideTargetBoard } from "./hooks/useDecideTargetBoard";
import { useSelectSideAndNumberOfBoards } from "./hooks/useSelectSideAndNumberOfBoards";
import { useRotateBoards } from "./hooks/useRotateBoards";
import { useDecideFoldMethod } from "./hooks/useDecideFoldMethod";
import { useRegisterOrigami } from "./hooks/useRegisterOrigami";
import { useOrigamiName } from "./hooks/useOrigamiName";
import { useOrigamiColor } from "./hooks/useOrigamiColor";

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

  const [procedureIndex, setProcedureIndex] = useState(1);
  const [procedure, setProcedure] = useState<Procedure>({});

  const [origamiDescription, setOrigamiDescription] = useState("");
  const [foldingAngle, setFoldingAngle] = useState(180);

  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const handleClosePopup = () => {
    setPopup(null);
  };

  const handleCancelFoldTarget = () => {
    setMoveBoards([]);
    setFixBoards([initialBoard]);
    setInputStep("axis");
  };

  const { origamiName, handleOrigamiNameChange } = useOrigamiName();
  const { origamiColor, handleOrigamiColorChange } = useOrigamiColor();

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

  const { handleDecideFoldMethod } = useDecideFoldMethod({
    fixBoards,
    moveBoards,
    numberOfMoveBoards,
    rotateAxis,
    isFoldingDirectionFront,
    isMoveBoardsRight,
    origamiDescription,
    foldingAngle,
    procedureIndex,
    procedure,
    setInputStep,
    setProcedureIndex,
    setProcedure,
    setFixBoards,
    setMoveBoards,
  });

  const { handleRegisterOrigami } = useRegisterOrigami({
    fixBoards,
    moveBoards,
    numberOfMoveBoards,
    rotateAxis,
    isFoldingDirectionFront,
    isMoveBoardsRight,
    origamiDescription,
    procedureIndex,
    procedure,
    origamiName,
    origamiColor,
    sceneRef,
    cameraRef,
    rendererRef,
  });

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

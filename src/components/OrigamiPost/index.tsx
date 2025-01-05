"use client";

import React, { useRef, useState } from "react";
import styles from "./index.module.scss";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Board } from "@/types/model";
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

  // 常に保持しておきたい変数
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const { origamiName, handleOrigamiNameChange } = useOrigamiName();
  const { origamiColor, handleOrigamiColorChange } = useOrigamiColor();

  // 折り方選択で、現在のステップを保持する変数
  const [inputStep, setInputStep] = useState<Step>("axis");
  const [procedureIndex, setProcedureIndex] = useState(1);

  // 各procedureでの、最終的に必要な情報を保持する変数
  const [origamiDescription, setOrigamiDescription] = useState("");
  const [fixBoards, setFixBoards] = useState<Board[]>([initialBoard]);
  const [moveBoards, setMoveBoards] = useState<Board[]>([]);
  const [foldingAngle, setFoldingAngle] = useState(180);

  // 最終的に保存したい情報を保持する変数。
  const [procedure, setProcedure] = useState<Procedure>({
    "1": {
      description: "",
      fixBoards: [],
      moveBoards: [],
      rotateAxis: [],
    },
  });

  //
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const handleClosePopup = () => {
    setPopup(null);
  };

  const handleCancelFoldTarget = () => {
    // TODO: fixBoardsを元に戻す処理
    setMoveBoards([]);
    setFixBoards([initialBoard]);
    setInputStep("target");
  };

  const handleChangeStep = (step: number) => {
    console.log(step);
  };

  // シーンの初期化
  useInitScene({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    raycasterRef,
  });

  // step1：折り線の点の選択
  // 板と点の描画を行う
  const { selectedPoints } = useSelectPoints({
    canvasRef,
    sceneRef,
    cameraRef,
    rendererRef,
    raycasterRef,
    inputStep,
    fixBoards,
    origamiColor,
  });

  // 入力された点から回転軸を決定。板を左右に分割する。
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

  // step2：板を折る対象を決定
  // 板を選択できるように描画する
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
    origamiColor,
  });

  // step3：板を折る方向と枚数を決定
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
          handleDecideRotateAxis={handleDecideRotateAxis}
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
          procedure={procedure}
          procedureIndex={procedureIndex}
          handleChangeStep={handleChangeStep}
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

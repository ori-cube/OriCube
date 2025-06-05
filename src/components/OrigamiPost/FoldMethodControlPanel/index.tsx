"use client";

import styles from "./index.module.scss";
import { AxisSelectPanel } from "./AxisSelectPanel";
import { FoldTargetSelectPanel } from "./FoldTargetSelectPanel";
import { FoldMethodSelectPanel } from "./FoldMethodSelectPanel";
import { FoldStepSegmentedControl } from "./ui/FoldStepSegmentedControl";
import React from "react";
import { Board, RotateAxis } from "@/types/model";

export type Step = "axis" | "target" | "fold";

type Props = {
  handleDecideRotateAxis: () => void;
  handleCancelRotateAxis: () => void;
  handleDecideFoldTarget: () => void;
  handleCancelFoldTarget: () => void;
  handleFoldFrontSide: () => void;
  handleFoldBackSide: () => void;
  foldAngle: number;
  handleFoldingAngleChange: (angle: number) => void;
  handleDecideFoldMethod: () => void;
  currentStep: Step;
  totalNumber: number;
  currentNumber: number;
  isFoldFrontSide: boolean;
  handleRegisterOrigami: () => void;
  origamiDescription: string;
  handleOrigamiDescriptionChange: (description: string) => void;
  inputStepLength: number;
  procedureIndex: number;
  handleChangeStep: (step: number) => void;
  origamiColor: string;
  foldBoards: Board[];
  notFoldBoards: Board[];
  // Folding state parameters
  rotateAxis: RotateAxis;
  numberOfMoveBoards: number;
  isFoldingDirectionFront: boolean;
  isMoveBoardsRight: boolean;
};

export const FoldMethodControlPanel: React.FC<Props> = ({
  handleDecideRotateAxis,
  handleCancelRotateAxis,
  handleDecideFoldTarget,
  handleCancelFoldTarget,
  handleFoldFrontSide,
  handleFoldBackSide,
  foldAngle,
  handleFoldingAngleChange,
  handleDecideFoldMethod,
  currentStep,
  totalNumber,
  currentNumber,
  isFoldFrontSide,
  handleRegisterOrigami,
  origamiDescription,
  handleOrigamiDescriptionChange,
  inputStepLength,
  procedureIndex,
  handleChangeStep,
  origamiColor,
  foldBoards,
  notFoldBoards,
  rotateAxis,
  numberOfMoveBoards,
  isFoldingDirectionFront,
  isMoveBoardsRight,
}) => {
  return (
    <section className={styles.container}>
      {currentStep === "axis" && (
        <AxisSelectPanel handleNextStep={handleDecideRotateAxis} />
      )}
      {currentStep === "target" && (
        <FoldTargetSelectPanel
          handlePrevStep={handleCancelRotateAxis}
          handleNextStep={handleDecideFoldTarget}
        />
      )}
      {currentStep === "fold" && (
        <FoldMethodSelectPanel
          handlePrevStep={handleCancelFoldTarget}
          handleFoldFrontSide={handleFoldFrontSide}
          handleFoldBackSide={handleFoldBackSide}
          foldAngle={foldAngle}
          handleFoldAngleChange={handleFoldingAngleChange}
          handleNextStep={handleDecideFoldMethod}
          totalNumber={totalNumber}
          currentNumber={currentNumber}
          isFoldFrontSide={isFoldFrontSide}
          handleRegisterOrigami={handleRegisterOrigami}
          origamiDescription={origamiDescription}
          handleOrigamiDescriptionChange={handleOrigamiDescriptionChange}
          origamiColor={origamiColor}
          foldBoards={foldBoards}
          notFoldBoards={notFoldBoards}
          rotateAxis={rotateAxis}
          numberOfMoveBoards={numberOfMoveBoards}
          isFoldingDirectionFront={isFoldingDirectionFront}
          isMoveBoardsRight={isMoveBoardsRight}
        />
      )}
      <div className={styles.segmentedControl}>
        <FoldStepSegmentedControl
          procedureLength={inputStepLength}
          currentStep={procedureIndex}
          handleChangeStep={handleChangeStep}
        />
      </div>
    </section>
  );
};

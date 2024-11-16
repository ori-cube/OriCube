"use client";

import styles from "./index.module.scss";
import { AxisSelectPanel } from "./AxisSelectPanel";
import { FoldTargetSelectPanel } from "./FoldTargetSelectPanel";
import { FoldMethodSelectPanel } from "./FoldMethodSelectPanel";
import React from "react";

export type Step = "axis" | "target" | "fold";

type Props = {
  handleDecideRotateAxis: () => void;
  handleCancelRotateAxis: () => void;
  handleDecideFoldTarget: () => void;
  handleCancelFoldTarget: () => void;
  handleFoldFrontSide: () => void;
  handleFoldBackSide: () => void;
  foldAngle: number;
  setFoldAngle: React.Dispatch<React.SetStateAction<number>>;
  handleDecideFoldMethod: () => void;
  currentStep: Step;
  totalNumber: number;
  currentNumber: number;
  isFoldFrontSide: boolean;
  handleRegisterOrigami: () => void;
  origamiDescription: string;
  setOrigamiDescription: React.Dispatch<React.SetStateAction<string>>;
};

export const FoldMethodControlPanel: React.FC<Props> = ({
  handleDecideRotateAxis,
  handleCancelRotateAxis,
  handleDecideFoldTarget,
  handleCancelFoldTarget,
  handleFoldFrontSide,
  handleFoldBackSide,
  foldAngle,
  setFoldAngle,
  handleDecideFoldMethod,
  currentStep,
  totalNumber,
  currentNumber,
  isFoldFrontSide,
  handleRegisterOrigami,
  origamiDescription,
  setOrigamiDescription,
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
          setFoldAngle={setFoldAngle}
          handleNextStep={handleDecideFoldMethod}
          totalNumber={totalNumber}
          currentNumber={currentNumber}
          isFoldFrontSide={isFoldFrontSide}
          handleRegisterOrigami={handleRegisterOrigami}
          origamiDescription={origamiDescription}
          setOrigamiDescription={setOrigamiDescription}
        />
      )}
    </section>
  );
};

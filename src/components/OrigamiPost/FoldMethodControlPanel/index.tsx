"use client";

import styles from "./index.module.scss";
import { AxisSelectPanel } from "./AxisSelectPanel";
import { FoldTargetSelectPanel } from "./FoldTargetSelectPanel";
import { FoldMethodSelectPanel } from "./FoldMethodSelectPanel";
import { FoldStepSegmentedControl } from "./ui/FoldStepSegmentedControl";
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
  handleFoldingAngleChange: (angle: number) => void;
  handleDecideFoldMethod: () => void;
  currentStep: Step;
  totalNumber: number;
  currentNumber: number;
  isFoldFrontSide: boolean;
  origamiDescription: string;
  handleOrigamiDescriptionChange: (description: string) => void;
  inputStepLength: number;
  procedureIndex: number;
  handleChangeStep: (step: number) => void;
  handleFinishFolding: () => void;
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
  origamiDescription,
  handleOrigamiDescriptionChange,
  inputStepLength,
  procedureIndex,
  handleChangeStep,
  handleFinishFolding,
}) => {
  return (
    <section className={styles.container}>
      <>
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
            handleFinishFolding={handleFinishFolding}
            origamiDescription={origamiDescription}
            handleOrigamiDescriptionChange={handleOrigamiDescriptionChange}
          />
        )}
        <div className={styles.segmentedControl}>
          <FoldStepSegmentedControl
            procedureLength={inputStepLength}
            currentStep={procedureIndex}
            handleChangeStep={handleChangeStep}
          />
        </div>
      </>
    </section>
  );
};

"use client";

import styles from "./index.module.scss";
import { AxisSelectPanel } from "./AxisSelectPanel";
import { FoldTargetSelectPanel } from "./FoldTargetSelectPanel";
import { FoldMethodSelectPanel } from "./FoldMethodSelectPanel";
import { FoldStepSegmentedControl } from "./ui/FoldStepSegmentedControl";
import React from "react";
import { PreviewPanel } from "./PreviewPanel";

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
  handleFinishFolding: () => void;
  isFinishFolding: boolean;
  name: string;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  color: string;
  handleColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  handleFinishFolding,
  isFinishFolding,
  name,
  handleNameChange,
  color,
  handleColorChange,
}) => {
  return (
    <section className={styles.container}>
      {!isFinishFolding ? (
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
      ) : (
        <PreviewPanel
          handlePrevStep={() => console.log("未実装")}
          handleNextStep={() => console.log("未実装")}
          handleRegisterOrigami={handleRegisterOrigami}
          name={name}
          handleNameChange={handleNameChange}
          color={color}
          handleColorChange={handleColorChange}
        />
      )}
    </section>
  );
};

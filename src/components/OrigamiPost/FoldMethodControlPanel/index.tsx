"use client";

import styles from "./index.module.scss";
import { AxisSelectPanel } from "./AxisSelectPanel";
import { FoldTargetSelectPanel } from "./FoldTargetSelectPanel";
import { FoldMethodSelectPanel } from "./FoldMethodSelectPanel";

export type Step = "axis" | "target" | "fold";

type Props = {
  handleDecideRotateAxis: () => void;
  handleCancelRotateAxis: () => void;
  handleDecideFoldTarget: () => void;
  currentStep: Step;
};

export const FoldMethodControlPanel: React.FC<Props> = ({
  handleDecideRotateAxis,
  handleCancelRotateAxis,
  handleDecideFoldTarget,
  currentStep,
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
          handlePrevStep={() => {}}
          handleNextStep={() => {}}
        />
      )}
    </section>
  );
};

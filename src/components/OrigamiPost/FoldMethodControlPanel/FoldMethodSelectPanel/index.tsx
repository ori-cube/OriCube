import styles from "./index.module.scss";
import { NextStepButton } from "../ui/NextStepButton";
import { PrevStepButton } from "../ui/PrevStepButton";
import { FoldButton } from "../ui/FoldButton";
import { Slider, TextArea } from "@radix-ui/themes";
import React from "react";

type Props = {
  handlePrevStep: () => void;
  handleFoldFrontSide: () => void;
  handleFoldBackSide: () => void;
  foldAngle: number;
  setFoldAngle: React.Dispatch<React.SetStateAction<number>>;
  handleNextStep: () => void;
};

export const FoldMethodSelectPanel: React.FC<Props> = ({
  handlePrevStep,
  handleNextStep,
  handleFoldFrontSide,
  handleFoldBackSide,
  foldAngle,
  setFoldAngle,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>折り方を選択</h2>
      <div className={styles.foldButtons}>
        <FoldButton
          handleClick={handleFoldFrontSide}
          currentStep={0}
          totalSteps={0}
          isFrontSide={true}
        />
        <FoldButton
          handleClick={handleFoldBackSide}
          currentStep={1}
          totalSteps={3}
          isFrontSide={false}
        />
      </div>
      <section className={styles.h3Section}>
        <h3 className={styles.h3}>折る角度</h3>
        <div className={styles.sliderWrapper}>
          0
          <Slider
            className={styles.slider}
            min={0}
            max={180}
            size="3"
            onValueChange={(value) => {
              setFoldAngle(value[0]);
            }}
            defaultValue={[180]}
            value={[foldAngle]}
          />
          180
        </div>
      </section>
      <section className={styles.h3Section}>
        <h3 className={styles.h3}>折り方の説明</h3>
        <TextArea placeholder="半分に折る" className={styles.textArea} />
      </section>
      <div className={styles.stepButtons}>
        <PrevStepButton handlePrevStep={handlePrevStep} />
        <NextStepButton handleNextStep={handleNextStep} />
      </div>
    </div>
  );
};

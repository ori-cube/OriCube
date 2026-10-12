import styles from "./index.module.scss";
import { NextStepButton } from "../ui/NextStepButton";
import { PrevStepButton } from "../ui/PrevStepButton";
import { FoldButton } from "../ui/FoldButton";
import { Slider, TextArea, Button } from "@oricube/design-system";

type Props = {
  handlePrevStep: () => void;
  handleFoldFrontSide: () => void;
  handleFoldBackSide: () => void;
  foldAngle: number;
  handleFoldAngleChange: (angle: number) => void;
  handleNextStep: () => void;
  totalNumber: number;
  currentNumber: number;
  isFoldFrontSide: boolean;
  handleRegisterOrigami: () => void;
  origamiDescription: string;
  handleOrigamiDescriptionChange: (description: string) => void;
};

export function FoldMethodSelectPanel({
  handlePrevStep,
  handleNextStep,
  handleFoldFrontSide,
  handleFoldBackSide,
  foldAngle,
  handleFoldAngleChange,
  totalNumber,
  currentNumber,
  isFoldFrontSide,
  handleRegisterOrigami,
  origamiDescription,
  handleOrigamiDescriptionChange,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h2 className={styles.title}>折り方を選択(3/3)</h2>
        <div className={styles.foldButtons}>
          <FoldButton
            handleClick={handleFoldFrontSide}
            currentStep={isFoldFrontSide ? currentNumber : 0}
            totalSteps={totalNumber}
            isFrontSide={true}
          />
          <FoldButton
            handleClick={handleFoldBackSide}
            currentStep={isFoldFrontSide ? 0 : currentNumber}
            totalSteps={totalNumber}
            isFrontSide={false}
          />
        </div>
        <section className={styles.h3Section}>
          <Slider label="折る角度（度）" minValue={0} maxValue={180} value={foldAngle} onChange={handleFoldAngleChange} />
        </section>
        <section className={styles.h3Section}>
          <TextArea
            label="折り方の説明"
            placeholder="半分に折る"
            className={styles.textArea}
            value={origamiDescription}
            onChange={handleOrigamiDescriptionChange}
          />
        </section>
        <div className={styles.stepButtons}>
          <PrevStepButton handlePrevStep={handlePrevStep} />
          <NextStepButton handleNextStep={handleNextStep} />
        </div>
      </div>
      <Button
        onClick={handleRegisterOrigami}
        className={styles.registerButton}
        text="折り紙を登録"
      />
    </div>
  );
}

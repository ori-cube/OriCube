"use client";

import { Model } from "@/types/model";
import { OrigamiTitle } from "@/components/OrigamiDetail/OrigamiTitle";
import { ControlPanel } from "@/components/OrigamiDetail/ControlPanel";
import { Three } from "./Three";
import styles from "./presenter.module.scss";

interface OrigamiDetailPresenterProps {
  sliderValue: number;
  setSliderValue: React.Dispatch<React.SetStateAction<number>>;
  procedureIndex: number;
  setProcedureIndex: React.Dispatch<React.SetStateAction<number>>;
  procedureLength: number;
  description: string;
  color: string;
  modelData: Model;
}

export const OrigamiDetailPresenter: React.FC<OrigamiDetailPresenterProps> = ({
  sliderValue,
  setSliderValue,
  procedureIndex,
  setProcedureIndex,
  procedureLength,
  description,
  color,
  modelData,
}) => {
  const currentStep = modelData.procedure[procedureIndex];
  const currentStepType = (currentStep?.type ?? "Base") as string;
  const foldingAngle = currentStep?.foldingAngle ?? 180;

  return (
    <div>
      <Three
        procedure={modelData.procedure}
        foldAngle={sliderValue}
        procedureIndex={procedureIndex}
        color={color}
      />
      <OrigamiTitle title={modelData.name} description={description} />
      <div className={styles.control}>
        <ControlPanel
          stepNum={5}
          value={sliderValue}
          setSliderValue={setSliderValue}
          maxArg={foldingAngle - 0.01} // ピッタリ折ると表示がバグるので、少しだけ引いておく
          procedureIndex={procedureIndex}
          setProcedureIndex={setProcedureIndex}
          procedureLength={procedureLength}
          currentStepType={currentStepType}
        />
      </div>
    </div>
  );
};

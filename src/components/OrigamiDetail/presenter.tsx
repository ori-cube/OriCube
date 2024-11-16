"use client";

import { Model } from "@/types/model";
import { OrigamiTitle } from "@/components/OrigamiDetail/OrigamiTitle";
import { ControlPanel } from "@/components/OrigamiDetail/ControlPanel";
import { Three } from "./Three";
import styles from "./presenter.module.scss";
import AddOrigamiButton from "./AddOrigamiButton";

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
  return (
    <div>
      <Three
        model={modelData.procedure}
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
          maxArg={179.99}
          procedureIndex={procedureIndex}
          setProcedureIndex={setProcedureIndex}
          procedureLength={procedureLength}
        />
      </div>
      <AddOrigamiButton />
    </div>
  );
};

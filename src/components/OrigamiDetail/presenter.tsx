"use client";

import { useState, useEffect } from "react";
import { Model } from "@/types/model";
import { OrigamiTitle } from "@/components/OrigamiTitle";
import { ControlPanel } from "@/components/ControlPanel";
import { Three } from "../three";
import styles from "./presenter.module.scss";

interface OrigamiDetailPresenterProps {
  modelData: Model;
}

export const OrigamiDetailPresenter: React.FC<OrigamiDetailPresenterProps> = ({
  modelData,
}) => {
  const [sliderValue, setSliderValue] = useState(0); //折り紙の折る進行状況を保持
  const [procedureIndex, setProcedureIndex] = useState(1); //折り紙の手順を保持

  useEffect(() => {
    setSliderValue(0);
  }, [procedureIndex]);

  const procedureLength = Object.keys(modelData.procedure).length;
  const description =
    modelData.procedure[procedureIndex.toString()].description;
  const color = modelData.color;

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
          maxArg={180}
          procedureIndex={procedureIndex}
          setProcedureIndex={setProcedureIndex}
          procedureLength={procedureLength}
        />
      </div>
    </div>
  );
};

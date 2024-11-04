"use client";

import { OrigamiDetailPresenter } from "./presenter";
import { useEffect, useState } from "react";
import { Model } from "@/types/model";

interface OrigamiDetailProps {
  modelData: Model;
}

export const OrigamiDetail: React.FC<OrigamiDetailProps> = (
  props: OrigamiDetailProps
) => {
  const [sliderValue, setSliderValue] = useState(0); //折り紙の折る進行状況を保持
  const [procedureIndex, setProcedureIndex] = useState(1); //折り紙の手順を保持

  useEffect(() => {
    setSliderValue(0);
  }, [procedureIndex]);

  const procedureLength = Object.keys(props.modelData.procedure).length;
  const description =
    props.modelData.procedure[procedureIndex.toString()].description;
  const color = props.modelData.color;

  return (
    <OrigamiDetailPresenter
      sliderValue={sliderValue}
      setSliderValue={setSliderValue}
      procedureIndex={procedureIndex}
      setProcedureIndex={setProcedureIndex}
      procedureLength={procedureLength}
      description={description}
      color={color}
      modelData={props.modelData}
    />
  );
};

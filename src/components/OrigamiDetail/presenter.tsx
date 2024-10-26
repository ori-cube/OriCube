"use client";

import { useState } from "react";
import { Model } from "@/types/model";
import { OrigamiTitle } from "@/components/OrigamiTitle";
import { ControlPanel } from "@/components/ControlPanel";
import { Three } from "../three";
import styles from "./presenter.module.scss";

interface OrigamiDetailPresenterProps {
  modelData: Model;
}

export const OrigamiDetailPresenter: React.FC<OrigamiDetailPresenterProps> = (
  props: OrigamiDetailPresenterProps
) => {
  const [sliderValue, setSliderValue] = useState(90); //折り紙の折る進行状況を保持

  return (
    <div>
      <Three model={props.modelData.procedure} foldAngle={sliderValue} />
      <OrigamiTitle title={props.modelData.name} description="hoge" />
      <div className={styles.control}>
        <ControlPanel
          stepNum={5}
          value={sliderValue}
          setSliderValue={setSliderValue}
          maxArg={180}
        />
      </div>
    </div>
  );
};

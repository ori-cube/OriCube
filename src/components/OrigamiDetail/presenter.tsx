"use client";

import { useState } from "react";
import { CameraView, Model } from "@/types/model";
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
  const [cameraView, setCameraView] = useState<CameraView>("default");

  return (
    <div>
      <Three
        procedure={modelData.procedure}
        foldAngle={sliderValue}
        procedureIndex={procedureIndex}
        color={color}
        cameraView={cameraView}
      />
      <OrigamiTitle title={modelData.name} description={description} />
      <div className={styles.control}>
        <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
          <button onClick={() => setCameraView("up")}>上</button>
          <button onClick={() => setCameraView("down")}>下</button>
          <button onClick={() => setCameraView("left")}>左</button>
          <button onClick={() => setCameraView("default")}>正面</button>
          <button onClick={() => setCameraView("right")}>右</button>
          <button onClick={() => setCameraView("back")}>背面</button>
        </div>
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
    </div>
  );
};

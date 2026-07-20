"use client";

import { CameraView, Model } from "@/types/model";
import { OrigamiTitle } from "@/components/OrigamiDetail/OrigamiTitle";
import { ControlPanel } from "@/components/OrigamiDetail/ControlPanel";
import { PerspectivePanel } from "@/components/OrigamiDetail/PerspectivePanel";
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
  cameraView: CameraView;
  setCameraView: React.Dispatch<React.SetStateAction<CameraView>>;
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
  cameraView,
  setCameraView,
}) => {
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
      <PerspectivePanel
        handleDirectionClick={(view: CameraView) => setCameraView(view)}
      />
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
    </div>
  );
};

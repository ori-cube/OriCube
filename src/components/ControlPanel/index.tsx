"use client";

import { useState, useEffect, use } from "react";
import { ControlPanelPresenter } from "./presenter";

interface ControlPanelProps {
  stepNum: number;
  value: number;
  setSliderValue: React.Dispatch<React.SetStateAction<number>>;
  maxArg: number;
  procedureIndex: number;
  setProcedureIndex: React.Dispatch<React.SetStateAction<number>>;
  procedureLength: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = (
  props: ControlPanelProps
) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const duration = 2500; // 再生時間

  const sliderValueChanged = (value: number) => {
    props.setSliderValue(value);
  };
  const increaseValue = () => {
    setIsPlaying((prevPlaying) => {
      return !prevPlaying;
    }); // 再生状態にする
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isPlaying) {
      const interval = 10; // 10ミリ秒ごとに更新
      const increment = props.maxArg / (duration / interval);
      intervalId = setInterval(() => {
        props.setSliderValue((prevProgress) => {
          if (prevProgress + increment >= props.maxArg) {
            clearInterval(intervalId);
            setIsPlaying(false); // 終了時に停止
            return props.maxArg;
          }
          return prevProgress + increment;
        });
      }, interval);
    }
    return () => clearInterval(intervalId); // クリーンアップ
  }, [isPlaying]);

  useEffect(() => {
    setIsPlaying(true);
  }, [props.procedureIndex]);

  return (
    <ControlPanelPresenter
      stepNum={props.stepNum}
      value={props.value}
      maxArg={props.maxArg}
      sliderValueChanged={sliderValueChanged}
      increaseValue={increaseValue}
      procedureIndex={props.procedureIndex}
      setProcedureIndex={props.setProcedureIndex}
      procedureLength={props.procedureLength}
    />
  );
};

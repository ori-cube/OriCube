"use client";

import { useState, useEffect } from "react";
import { ControlPanelPresenter } from "./presenter";
import { onSliderMax, pauseSlider, playSlider } from "./hooks";

export interface ControlPanelProps {
  stepNum: number; //一度に表示する個数
  value: number; //プログレスバーのパーセント
  setSliderValue: React.Dispatch<React.SetStateAction<number>>;
  maxArg: number; //プログレスバーの最大値
  procedureIndex: number; //現在のステップ数
  setProcedureIndex: React.Dispatch<React.SetStateAction<number>>;
  procedureLength: number; //ステップ数の総数
}

export const ControlPanel: React.FC<ControlPanelProps> = (
  props: ControlPanelProps
) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoop, setIsLoop] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();
  const duration = 2500; // 再生時間

  const sliderValueChanged = (value: number) => {
    props.setSliderValue(value);
  };

  const switchPlaying = () => {
    if (isPlaying) {
      setIsPlaying(false);
      pauseSlider(intervalId!);
    } else {
      if (props.value >= props.maxArg) {
        props.setSliderValue(0);
      }
      setIsPlaying(true);
      const newIntervalId = playSlider(props, duration);
      setIntervalId(newIntervalId);
    }
  };

  onSliderMax(props, isLoop, setIsPlaying, intervalId!);

  // 折り方のindexが切り替わったときに、自動再生する
  useEffect(() => {
    if (intervalId) {
      pauseSlider(intervalId);
    }
    setIsPlaying(true);
    const newIntervalId = playSlider(props, duration);
    setIntervalId(newIntervalId);
    return () => {
      pauseSlider(newIntervalId);
    };
  }, [props.procedureIndex]);

  const onLoopClick = () => {
    setIsLoop((prevLoop) => {
      return !prevLoop;
    });
  };

  return (
    <ControlPanelPresenter
      stepNum={props.stepNum}
      isPlaying={isPlaying}
      value={props.value}
      maxArg={props.maxArg}
      sliderValueChanged={sliderValueChanged}
      switchPlaying={switchPlaying}
      procedureIndex={props.procedureIndex}
      setProcedureIndex={props.setProcedureIndex}
      procedureLength={props.procedureLength}
      isLoop={isLoop}
      onLoopClick={onLoopClick}
    />
  );
};

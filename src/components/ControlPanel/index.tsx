"use client"

import { useState, useEffect } from "react";
import { ControlPanelPresenter } from "./presenter";

interface ControlPanelProps {
  stepNum: number
  value: number
  setSliderValue: React.Dispatch<React.SetStateAction<number>>
  maxArg: number
}

export const ControlPanel: React.FC<ControlPanelProps> = (props: ControlPanelProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(1) //ここに現状のステップを入力すれば動きます。
  const duration = 3000; // 再生時間

  const sliderValueChanged = (value: number) => {
    props.setSliderValue(value)
  }
  const increaseValue = () => {
    setIsPlaying((prevPlaying) => {return !prevPlaying}); // 再生状態にする
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isPlaying) {
      const interval = 100; // 100ミリ秒ごとに更新
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

  return <ControlPanelPresenter step={step} setStep={setStep} stepNum={props.stepNum} value={props.value} maxArg={props.maxArg} isPlaying={isPlaying} sliderValueChanged={sliderValueChanged} increaseValue={increaseValue}/>
}
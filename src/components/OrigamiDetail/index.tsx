"use client"

import { useState } from "react";
import { OrigamiDetailPresenter } from "./presenter";

export const OrigamiDetail: React.FC = () => {
  const [step, setStep] = useState(1) //今のステップ番号
  const [sliderValue, setSliderValue] = useState(0) //折り紙の折る進行状況を保持
  const stepNum = 10 //折り紙の折るステップの総数

  return <OrigamiDetailPresenter stepNum={stepNum} step={step} setStep={setStep} sliderValue={sliderValue} setSliderValue={setSliderValue}/>
}
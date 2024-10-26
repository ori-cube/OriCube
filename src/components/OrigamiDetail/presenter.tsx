"use client"

import { useState } from "react";
import { ControlPanel } from "@/components/ControlPanel";
import style from "./presenter.module.scss"

export const OrigamiDetailPresenter: React.FC = () => {
  const [sliderValue, setSliderValue] = useState(0) //折り紙の折る進行状況を保持

  return(
    <div className={style.container}>
      <ControlPanel stepNum={10} value={sliderValue} setSliderValue={setSliderValue} maxArg={180}/>
    </div>
  )
}
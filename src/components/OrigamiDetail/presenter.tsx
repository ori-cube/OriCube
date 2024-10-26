"use client"

import { useState } from "react";
import { Model } from "@/types/model";
import { OrigamiTitle } from "@/components/OrigamiTitle";
import { ControlPanel } from "@/components/ControlPanel";

interface OrigamiDetailPresenterProps {
  modelData: Model
}

export const OrigamiDetailPresenter: React.FC<OrigamiDetailPresenterProps> = (props: OrigamiDetailPresenterProps) => {
  const [sliderValue, setSliderValue] = useState(0) //折り紙の折る進行状況を保持

  return(
    <div>
      <OrigamiTitle title={props.modelData.name} description="hoge" />
      <ControlPanel stepNum={5} value={sliderValue} setSliderValue={setSliderValue} maxArg={180}/>
    </div>
  )
}
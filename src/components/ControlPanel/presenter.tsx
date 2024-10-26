"use client"

import { useState } from "react";
import style from "./presenter.module.scss"
import { Slider, Flex } from "@radix-ui/themes"
import { HiMiniPlay, HiMiniPause, HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi2";
import { Pagination } from "../Pagination";
interface ControlPanelPresenterProps {
  step: number
  setStep: React.Dispatch<React.SetStateAction<number>>
  stepNum: number
  value: number
  maxArg: number
  isPlaying: boolean
  sliderValueChanged: (value: number) => void
  increaseValue: () => void
}

export const ControlPanelPresenter: React.FC<ControlPanelPresenterProps> = (props: ControlPanelPresenterProps) => {
  return(
    <>
      <div className={style.control_panel}>
        <Flex align="center" height="46px" justify="between" gap="4" className={style.controller}>
          {props.isPlaying ? <HiMiniPause size={24} color="#1109ad" onClick={props.increaseValue}/> : <HiMiniPlay  size={24} color="#1109ad" onClick={props.increaseValue}/>}
          <Slider value={[props.value]} onValueChange={(value) => {props.sliderValueChanged(value[0])}} defaultValue={[0]} size="1" min={0} max={props.maxArg}/>
        </Flex>
        <Pagination
          currentPage={props.step}
          limit={4}
          count={props.stepNum}
          changePage={props.setStep}
        />
      </div>

      <div className={style.control_panel_sp}>
        <Slider value={[props.value]} onValueChange={(value) => {props.sliderValueChanged(value[0])}} defaultValue={[0]} size="1" min={0} max={props.maxArg}/>
        <div className={style.controller_container_sp}>
          <Flex align="center" display="flex" height="46px" justify="between" gap="2" className={style.controller_sp}>
            <HiOutlineArrowLeft size={16} className={(props.step===1)?(style.button_disable):""} onClick={() => {props.setStep((step) => step-1)}}/>
            {props.isPlaying ? <HiMiniPause size={24} color="#1109ad" onClick={props.increaseValue}/> : <HiMiniPlay  size={24} color="#1109ad" onClick={props.increaseValue}/>}
            <HiOutlineArrowRight size={16} className={(props.step===props.stepNum)?(style.button_disable):""} onClick={() => {props.setStep((step) => step+1)}}/>
          </Flex>
        </div>
      </div>
    </>
  )
}
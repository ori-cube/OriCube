"use client"

import { useState } from "react";
import style from "./presenter.module.scss"
import { Slider, Flex } from "@radix-ui/themes"
import { HiMiniPlay } from "react-icons/hi2";
// import { Pagination } from '@nextui-org/react';
import { Pagination } from "../Pagination";
interface ControlPanelPresenterProps {
  stepNum: number
  value: number
  maxArg: number
  sliderValueChanged: (value: number) => void
  increaseValue: () => void
}

export const ControlPanelPresenter: React.FC<ControlPanelPresenterProps> = (props: ControlPanelPresenterProps) => {
  const [page, setPage] = useState(1)
  return(
    <div className={style.control_panel}>
      <Flex align="center" height="46px" justify="between" gap="4" className={style.controller}>
        <HiMiniPlay  size={24} color="#1109ad" onClick={props.increaseValue}/>
        <Slider value={[props.value]} onValueChange={(value) => {props.sliderValueChanged(value[0])}} defaultValue={[0]} size="1" min={0} max={props.maxArg}/>
      </Flex>
      <Pagination
        currentPage={page}
        limit={4}
        count={10}
        changePage={setPage}
      />
    </div>
  )
}
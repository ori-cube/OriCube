"use client"

// import { useState } from "react";
import style from "./presenter.module.scss"
import { Slider, Flex } from "@radix-ui/themes"
import { HiMiniPlay } from "react-icons/hi2";
import { HiMiniArrowLeft, HiMiniArrowRight, HiEllipsisHorizontal } from "react-icons/hi2";


interface ControlPanelPresenterProps {
  stepNum: number
  value: number
  maxArg: number
  sliderValueChanged: (value: number) => void
  increaseValue: () => void
}

export const ControlPanelPresenter: React.FC<ControlPanelPresenterProps> = (props: ControlPanelPresenterProps) => {
  // const totalPageNum = 10
  // const [page, setPage] = useState(1)

  const PaginationNext = () => {
    return(
      <HiMiniArrowRight size={16} />
    )
  }

  const PaginationPrev = () => {
    return (
      <HiMiniArrowLeft size={16}/>
    )
  }

  const PaginationEllipsis = () => {
    return (
      <HiEllipsisHorizontal size={16} />
    )
  }

  const PaginationNum = (num: number) => {
    return (
      <div className={style.box}>
        {num}
      </div>
    )
  }
  return(
    <div className={style.control_panel}>
      <Flex align="center" height="46px" justify="between" gap="4" className={style.controller}>
        <HiMiniPlay  size={24} color="#1109ad" onClick={props.increaseValue}/>
        <Slider value={[props.value]} onValueChange={(value) => {props.sliderValueChanged(value[0])}} defaultValue={[0]} size="1" min={0} max={props.maxArg}/>
      </Flex>
      <Flex align="center" height="46px" justify="between" gap="4" className={style.controller}>
        {PaginationPrev()}
        {PaginationNum(2)}
        {PaginationEllipsis()}
        {PaginationNext()}
      </Flex>

    </div>
  )
}
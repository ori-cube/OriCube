"use client";

import React from "react";
import style from "./presenter.module.scss";
import { Slider, Flex } from "@radix-ui/themes";
import { HiMiniPlay } from "react-icons/hi2";
import { Pagination } from "../Pagination";
import { IconButton } from "../IconButton";

interface ControlPanelPresenterProps {
  stepNum: number;
  value: number;
  maxArg: number;
  sliderValueChanged: (value: number) => void;
  increaseValue: () => void;
  procedureIndex: number;
  setProcedureIndex: React.Dispatch<React.SetStateAction<number>>;
  procedureLength: number;
}

export const ControlPanelPresenter: React.FC<ControlPanelPresenterProps> = (
  props: ControlPanelPresenterProps
) => {
  return (
    <div className={style.control_panel}>
      <Flex
        align="center"
        width="100%"
        height="46px"
        justify="between"
        gap="4"
        className={style.controller}
      >
        <IconButton
          handleClick={props.increaseValue}
          Icon={HiMiniPlay}
          color="#1109ad"
        />
        <Slider
          value={[props.value]}
          onValueChange={(value) => {
            props.sliderValueChanged(value[0]);
          }}
          defaultValue={[0]}
          size="2"
          min={0}
          max={props.maxArg}
          className={style.slider}
        />
      </Flex>
      <Pagination
        currentPage={props.procedureIndex}
        limit={props.procedureLength}
        count={props.procedureLength}
        changePage={props.setProcedureIndex}
      />
    </div>
  );
};

"use client";

import React from "react";
import style from "./presenter.module.scss";
import { Slider, Flex } from "@radix-ui/themes";
import { HiMiniPlay, HiMiniStop } from "react-icons/hi2";
import { Pagination } from "../Pagination";
import { IconButton } from "../IconButton";

interface ControlPanelPresenterProps {
  stepNum: number;
  value: number;
  maxArg: number;
  isPlaying: boolean;
  sliderValueChanged: (value: number) => void;
  switchPlaying: () => void;
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
        {props.isPlaying ? (
          <IconButton
            handleClick={props.switchPlaying}
            Icon={HiMiniStop}
            color="#1109ad"
          />
        ) : (
          <IconButton
            handleClick={props.switchPlaying}
            Icon={HiMiniPlay}
            color="#1109ad"
          />
        )}
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

"use client";

import React from "react";
import style from "./presenter.module.scss";
import { Slider, Flex } from "@radix-ui/themes";
import {
  HiMiniPlay,
  HiMiniPause,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
} from "react-icons/hi2";
import { Pagination } from "./Pagination";
import { IconButton } from "../../ui/IconButton";
import { HiArrowPathRoundedSquare } from "react-icons/hi2";
import { PlayButton } from "./PlayButton";
import { LoopButton } from "./LoopButton";

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
  isLoop: boolean;
  onLoopClick: () => void;
  isLoopStandby: boolean;
}

export const ControlPanelPresenter: React.FC<ControlPanelPresenterProps> = (
  props: ControlPanelPresenterProps
) => {
  return (
    <>
      <div className={style.control_panel}>
        <Flex
          align="center"
          width="100%"
          height="46px"
          justify="between"
          gap="4"
          className={style.controller}
        >
          <PlayButton
            handleClick={props.switchPlaying}
            Icon={props.isPlaying ? HiMiniPause : HiMiniPlay}
            color="#1109ad"
            disable={false}
            isLoopStandby={props.isLoopStandby}
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
          <LoopButton
            handleClick={props.onLoopClick}
            Icon={HiArrowPathRoundedSquare}
            color={props.isLoop ? "#ffffff" : "#000000"}
            active={props.isLoop}
          />
        </Flex>
        <Pagination
          currentPage={props.procedureIndex}
          limit={5}
          count={props.procedureLength}
          changePage={props.setProcedureIndex}
        />
      </div>

      <div className={style.control_panel_sp}>
        <Slider
          value={[props.value]}
          onValueChange={(value) => {
            props.sliderValueChanged(value[0]);
          }}
          defaultValue={[0]}
          size="1"
          min={0}
          max={props.maxArg}
        />
        <div className={style.controller_container_sp}>
          <Flex
            align="center"
            display="flex"
            height="46px"
            justify="center"
            className={style.controller_sp}
          >
            <IconButton
              handleClick={props.switchPlaying}
              Icon={props.isPlaying ? HiMiniPause : HiMiniPlay}
              color="#1109ad"
              disable={false}
            />
            <IconButton
              handleClick={props.onLoopClick}
              Icon={HiArrowPathRoundedSquare}
              color={props.isLoop ? "#1109ad" : "#000000"}
              disable={false}
            />
          </Flex>
          <Flex
            align="center"
            display="flex"
            height="46px"
            justify="center"
            className={style.controller_sp}
          >
            <IconButton
              handleClick={() => {
                if (props.procedureIndex != 1) {
                  props.setProcedureIndex((step) => step - 1);
                }
              }}
              Icon={HiOutlineArrowLeft}
              color="#000"
              disable={false}
            />
            <div className={style.step_num_sp}>
              {props.procedureIndex}/{props.procedureLength}
            </div>
            <IconButton
              handleClick={() => {
                if (props.procedureIndex != props.procedureLength) {
                  props.setProcedureIndex((step) => step + 1);
                }
              }}
              Icon={HiOutlineArrowRight}
              color="#000"
              disable={false}
            />
          </Flex>
        </div>
      </div>
    </>
  );
};

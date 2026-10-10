"use client";

import React from "react";
import style from "./presenter.module.scss";
import { Slider } from "@oricube/design-system";
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

export function ControlPanelPresenter(props: ControlPanelPresenterProps) {
  return (
    <>
      <div className={style.control_panel}>
        <div className={style.controller}>
          <PlayButton
            handleClick={props.switchPlaying}
            Icon={props.isPlaying ? HiMiniPause : HiMiniPlay}
            color="#1109ad"
            disable={false}
            isLoopStandby={props.isLoopStandby}
          />
          <Slider label="折りの進み具合" value={props.value} onChange={props.sliderValueChanged} minValue={0} maxValue={props.maxArg} />
          <LoopButton
            handleClick={props.onLoopClick}
            Icon={HiArrowPathRoundedSquare}
            color={props.isLoop ? "#ffffff" : "#000000"}
            active={props.isLoop}
          />
        </div>
        <Pagination
          currentPage={props.procedureIndex}
          limit={5}
          count={props.procedureLength}
          changePage={props.setProcedureIndex}
        />
      </div>

      <div className={style.control_panel_sp}>
        <Slider label="折りの進み具合" value={props.value} onChange={props.sliderValueChanged} minValue={0} maxValue={props.maxArg} />
        <div className={style.controller_container_sp}>
          <div className={style.controller_sp}>
            <PlayButton
              handleClick={props.switchPlaying}
              Icon={props.isPlaying ? HiMiniPause : HiMiniPlay}
              color="#1109ad"
              disable={false}
              isLoopStandby={props.isLoopStandby}
            />
            <LoopButton
              handleClick={props.onLoopClick}
              Icon={HiArrowPathRoundedSquare}
              color={props.isLoop ? "#ffffff" : "#000000"}
              active={props.isLoop}
            />
          </div>
          <div className={style.controller_sp}>
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
          </div>
        </div>
      </div>
    </>
  );
}

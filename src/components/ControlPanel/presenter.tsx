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
import { Pagination } from "../ui/Pagination";
import { IconButton } from "../ui/IconButton";

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
          {props.isPlaying ? (
            <IconButton
              handleClick={props.switchPlaying}
              Icon={HiMiniPause}
              color="#1109ad"
              disable={false}
            />
          ) : (
            <IconButton
              handleClick={props.switchPlaying}
              Icon={HiMiniPlay}
              color="#1109ad"
              disable={false}
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
          <div className={style.box}>
            <Flex
              align="center"
              display="flex"
              height="46px"
              justify="between"
              gap="2"
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
              {props.isPlaying ? (
                <IconButton
                  handleClick={props.switchPlaying}
                  Icon={HiMiniPause}
                  color="#1109ad"
                  disable={false}
                />
              ) : (
                <IconButton
                  handleClick={props.switchPlaying}
                  Icon={HiMiniPlay}
                  color="#1109ad"
                  disable={false}
                />
              )}
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
      </div>
    </>
  );
};

import { useEffect } from "react";
import { ControlPanelProps } from ".";
import React from "react";

export function useOnSliderMax(
  props: ControlPanelProps,
  isLoop: boolean,
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>,
  intervalId: NodeJS.Timeout
) {
  // スライダーの値が最大に達したとき && Loop状態出ない時に再生を停止
  useEffect(() => {
    if (props.value >= props.maxArg && !isLoop) {
      pauseSlider(intervalId);
      setIsPlaying(false);
    } else if (props.value >= props.maxArg && isLoop) {
      props.setSliderValue(0);
    }
  }, [props.value]);
}

export function playSlider(props: ControlPanelProps, duration: number) {
  // let intervalId: NodeJS.Timeout;

  const interval = 10; // 10ミリ秒ごとに更新
  const increment = props.maxArg / (duration / interval);

  const intervalId = setInterval(() => {
    props.setSliderValue((prevProgress) => {
      const newProgress = prevProgress + increment;
      if (newProgress >= props.maxArg) {
        return props.maxArg;
      }
      return newProgress;
    });
  }, interval);
  return intervalId;
}

export function pauseSlider(intervalId: NodeJS.Timeout) {
  if (intervalId) {
    clearInterval(intervalId);
  }
}

"use client";

import { useState, useEffect, useRef } from "react";
import { ControlPanelPresenter } from "./presenter";
import { useOnSliderMax, pauseSlider, playSlider } from "./hooks";

export interface ControlPanelProps {
  stepNum: number; //一度に表示する個数
  value: number; //プログレスバーのパーセント
  setSliderValue: React.Dispatch<React.SetStateAction<number>>;
  maxArg: number; //プログレスバーの最大値
  procedureIndex: number; //現在のステップ数
  setProcedureIndex: React.Dispatch<React.SetStateAction<number>>;
  procedureLength: number; //ステップ数の総数
  currentStepType: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = (
  props: ControlPanelProps
) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoop, setIsLoop] = useState(true);
  const [isLoopStandby, setIsLoopStandby] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | undefined>(undefined);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const midpointTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const midpointHandledRef = useRef(false);
  const prevValueRef = useRef(props.value);
  const isPlayingRef = useRef(isPlaying);
  const duration = 2500; // 再生時間

  const sliderValueChanged = (value: number) => {
    props.setSliderValue(value);
  };

  const switchPlaying = () => {
    if (isPlaying && !isLoopStandby) {
      setIsPlaying(false);
      const activeInterval = intervalRef.current;
      if (activeInterval) {
        pauseSlider(activeInterval);
        intervalRef.current = null;
        setIntervalId(undefined);
      }
      if (midpointTimeoutRef.current) {
        clearTimeout(midpointTimeoutRef.current);
        midpointTimeoutRef.current = null;
      }
    } else if (!isLoopStandby && !isPlaying) {
      if (props.value >= props.maxArg) {
        props.setSliderValue(0);
      }
      setIsPlaying(true);
      if (midpointTimeoutRef.current) {
        clearTimeout(midpointTimeoutRef.current);
        midpointTimeoutRef.current = null;
      }
      const newIntervalId = playSlider(props, duration);
      intervalRef.current = newIntervalId;
      setIntervalId(newIntervalId);
    } else if (isLoopStandby) {
      props.setSliderValue(0);
    }
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useOnSliderMax(
    props,
    isLoop,
    setIsPlaying,
    intervalId!,
    isPlaying,
    isLoopStandby,
    setIsLoopStandby
  );

  // 折り方のindexが切り替わったときに、自動再生する
  useEffect(() => {
    if (intervalId) {
      pauseSlider(intervalId);
    }
    intervalRef.current = null;
    midpointHandledRef.current = false;
    prevValueRef.current = 0;
    if (midpointTimeoutRef.current) {
      clearTimeout(midpointTimeoutRef.current);
      midpointTimeoutRef.current = null;
    }
    setIsPlaying(true);
    const newIntervalId = playSlider(props, duration);
    intervalRef.current = newIntervalId;
    setIntervalId(newIntervalId);
    return () => {
      pauseSlider(newIntervalId);
    };
  }, [props.procedureIndex]);

  useEffect(() => {
    const prevValue = prevValueRef.current;
    const currentValue = props.value;
    const midpoint = props.maxArg / 2;

    if (props.currentStepType !== "crease" && midpointHandledRef.current) {
      midpointHandledRef.current = false;
    }

    const shouldHandleMidpoint =
      props.currentStepType === "crease" &&
      !midpointHandledRef.current &&
      prevValue < midpoint &&
      currentValue >= midpoint &&
      isPlayingRef.current;

    if (shouldHandleMidpoint) {
      midpointHandledRef.current = true;
      const activeInterval = intervalRef.current;
      if (activeInterval) {
        pauseSlider(activeInterval);
        intervalRef.current = null;
        setIntervalId(undefined);
      }
      if (midpointTimeoutRef.current) {
        clearTimeout(midpointTimeoutRef.current);
      }
      midpointTimeoutRef.current = setTimeout(() => {
        midpointTimeoutRef.current = null;
        if (!isPlayingRef.current) {
          return;
        }
        const resumedInterval = playSlider(props, duration);
        intervalRef.current = resumedInterval;
        setIntervalId(resumedInterval);
      }, 1000);
    }

    if (currentValue <= 0) {
      midpointHandledRef.current = false;
    }

    prevValueRef.current = currentValue;
  }, [props.value, props.maxArg, props.currentStepType, intervalId]);

  useEffect(() => {
    return () => {
      const activeInterval = intervalRef.current;
      if (activeInterval) {
        pauseSlider(activeInterval);
        intervalRef.current = null;
      }
      if (midpointTimeoutRef.current) {
        clearTimeout(midpointTimeoutRef.current);
        midpointTimeoutRef.current = null;
      }
    };
  }, []);

  const onLoopClick = () => {
    setIsLoop((prevLoop) => {
      return !prevLoop;
    });
  };

  return (
    <ControlPanelPresenter
      stepNum={props.stepNum}
      isPlaying={isPlaying}
      value={props.value}
      maxArg={props.maxArg}
      sliderValueChanged={sliderValueChanged}
      switchPlaying={switchPlaying}
      procedureIndex={props.procedureIndex}
      setProcedureIndex={props.setProcedureIndex}
      procedureLength={props.procedureLength}
      isLoop={isLoop}
      onLoopClick={onLoopClick}
      isLoopStandby={isLoopStandby}
    />
  );
};

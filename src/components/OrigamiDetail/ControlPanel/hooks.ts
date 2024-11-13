import { useEffect, useRef } from "react";
import { ControlPanelProps } from ".";
import React from "react";

export function useOnSliderMax(
  props: ControlPanelProps,
  isLoop: boolean,
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>,
  intervalId: NodeJS.Timeout,
  isPlaying: boolean,
  setIsLoopStandby: React.Dispatch<React.SetStateAction<boolean>>
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (props.value >= props.maxArg) {
      if (!isLoop) {
        // Loop が無効の場合、スライダーを停止
        pauseSlider(intervalId);
        setIsPlaying(false);
      } else {
        // Loop が有効の場合、3秒後にスライダーをリセット
        setIsLoopStandby(true);
        timeoutRef.current = setTimeout(() => {
          props.setSliderValue(0);
          setIsLoopStandby(false);
        }, 2500); // 3000ミリ秒 = 3秒
      }
    }

    // クリーンアップ関数: タイムアウトをクリア
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setIsLoopStandby(false);
      }
    };
  }, [props.value, isLoop, intervalId, setIsPlaying, props]);

  useEffect(() => {
    // isPlaying が false に変更された場合、タイムアウトをクリア
    if (!isPlaying && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsLoopStandby(false);
      props.setSliderValue(0);
    }
  }, [isPlaying]);
}

export function playSlider(props: ControlPanelProps, duration: number) {
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

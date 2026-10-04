"use client";

import { Label, Slider as AriaSlider, SliderOutput, SliderThumb, SliderTrack, type SliderProps as AriaSliderProps } from "react-aria-components";
import styles from "./Slider.module.css";

export type SliderProps = Omit<AriaSliderProps<number>, "children" | "className"> & {
  label: string;
};

export function Slider({ label, ...props }: SliderProps) {
  return (
    <AriaSlider {...props} className={styles.slider}>
      <div className={styles.heading}><Label>{label}</Label><SliderOutput /></div>
      <SliderTrack className={styles.track}>
        {({ state }) => <>
          <div className={styles.rail} />
          <div className={styles.fill} style={{ width: `${state.getThumbPercent(0) * 100}%` }} />
          <SliderThumb className={styles.thumb} />
        </>}
      </SliderTrack>
    </AriaSlider>
  );
}

"use client";

import { Label, Slider as AriaSlider, SliderOutput, SliderThumb, SliderTrack, type SliderProps as AriaSliderProps } from "react-aria-components";
import styles from "./Slider.module.css";

export type SliderProps = Omit<AriaSliderProps<number>, "children" | "className"> & {
  label: string;
  layout?: "stacked" | "inline";
};

export function Slider({ label, layout = "stacked", ...props }: SliderProps) {
  return (
    <AriaSlider {...props} className={[styles.slider, layout === "inline" ? styles.inline : undefined].filter(Boolean).join(" ")}>
      <div className={styles.heading}><Label className={layout === "inline" ? styles.hiddenLabel : undefined}>{label}</Label><SliderOutput /></div>
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

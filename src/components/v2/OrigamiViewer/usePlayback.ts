"use client";

import { useEffect, useRef, useState } from "react";

export const usePlayback = (stepCount: number, isFlip: (index: number) => boolean) => {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const flip = isFlip(index);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPlaying(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion || stepCount === 0) return;
    let frameId: number | null = null;
    let previousTime: number | null = null;
    let value = progressRef.current;
    let hold = 0;
    const duration = flip ? 800 : 2000;
    const frame = (time: number) => {
      const delta = previousTime === null ? 0 : time - previousTime;
      previousTime = time;
      if (value < 1) {
        value = Math.min(1, value + delta / duration);
        setProgress(value);
      } else if (loop) {
        hold += delta;
        if (hold >= 1000) { value = 0; hold = 0; setProgress(0); }
      } else { setPlaying(false); return; }
      frameId = requestAnimationFrame(frame);
    };
    const visibility = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      previousTime = null;
      if (!document.hidden) frameId = requestAnimationFrame(frame);
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [playing, reducedMotion, stepCount, index, flip, loop]);

  return {
    index, progress, playing, loop, reducedMotion,
    selectStep: (nextIndex: number) => {
      setPlaying(false);
      setProgress(0);
      setIndex(Math.max(0, Math.min(nextIndex, stepCount - 1)));
    },
    scrub: (value: number) => { setPlaying(false); setProgress(Math.max(0, Math.min(1, value))); },
    togglePlaying: () => {
      if (stepCount === 0) return;
      if (reducedMotion) { setProgress(1); return; }
      if (!playing && progress >= 1) setProgress(0);
      setPlaying(!playing);
    },
    toggleLoop: () => setLoop(!loop),
  };
};

import { useLayoutEffect, useState, type RefObject } from "react";
import type { ViewerInsets } from "./scene";

export const useViewerInsets = (viewerRef: RefObject<HTMLElement>, headingRef: RefObject<HTMLElement>, bottomRef: RefObject<HTMLElement>) => {
  const [insets, setInsets] = useState<ViewerInsets>({ top: 0, bottom: 0 });
  useLayoutEffect(() => {
    const viewer = viewerRef.current;
    const heading = headingRef.current;
    const bottom = bottomRef.current;
    if (!viewer || !heading || !bottom) return;
    const update = () => {
      const bounds = viewer.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(viewer).paddingTop) || 16;
      const topSpace = Math.max(0, Math.ceil(heading.getBoundingClientRect().bottom - bounds.top + gap));
      const bottomSpace = Math.max(0, Math.ceil(bounds.bottom - bottom.getBoundingClientRect().top + gap));
      viewer.style.setProperty("--viewer-top-space", `${topSpace}px`);
      viewer.style.setProperty("--viewer-bottom-space", `${bottomSpace}px`);
      setInsets(previous => previous.top === topSpace && previous.bottom === bottomSpace ? previous : { top: topSpace, bottom: bottomSpace });
    };
    const observer = new ResizeObserver(update);
    [viewer, heading, bottom].forEach(element => observer.observe(element));
    update();
    return () => observer.disconnect();
  }, [viewerRef, headingRef, bottomRef]);
  return insets;
};

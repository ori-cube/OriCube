import { OrbitControls } from "three/examples/jsm/Addons.js";

export const createDemandRenderer = (
  controls: OrbitControls,
  render: () => void
) => {
  let frameId: number | null = null;
  let disposed = false;

  const requestRender = () => {
    if (disposed || document.hidden || frameId !== null) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      if (disposed || document.hidden) return;
      // 慣性で視点が変化した場合だけ、changeイベントが次の描画を予約する。
      if (controls.enabled) controls.update();
      render();
    });
  };

  const cancelFrame = () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  };

  const handleVisibility = () => {
    if (document.hidden) cancelFrame();
    else requestRender();
  };

  controls.addEventListener("change", requestRender);
  document.addEventListener("visibilitychange", handleVisibility);
  requestRender();

  return {
    requestRender,
    dispose: () => {
      disposed = true;
      cancelFrame();
      controls.removeEventListener("change", requestRender);
      document.removeEventListener("visibilitychange", handleVisibility);
    },
  };
};

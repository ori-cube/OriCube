"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, FloatingPanel, IconButton, SearchIcon, SidePanel, Slider } from "@oricube/design-system";
import type { OrigamiModelV2 } from "@/features/origami-viewer-v2/model";
import { OrigamiCanvas } from "./Canvas";
import { createViewerTimeline } from "@oricube/engine";
import { usePlayback } from "./usePlayback";
import styles from "./Viewer.module.css";

export interface OrigamiViewerProps {
  model: OrigamiModelV2;
  startAtEnd?: boolean;
  fullscreen?: boolean;
}

export function OrigamiViewer({ model, startAtEnd = false, fullscreen = false }: OrigamiViewerProps) {
  const timeline = useMemo(() => createViewerTimeline(model.procedure), [model.procedure]);
  const [resetKey, setResetKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  const playback = usePlayback(timeline.steps.length, (index) => timeline.steps[index]?.kind === "flip", startAtEnd);
  const step = timeline.steps[playback.index];
  const description = step?.kind === "fold" ? model.stepDescriptions?.[step.sourceIndex] ?? step.label : step?.label ?? model.description;
  const showControls = timeline.steps.length > 0;
  const stepName = step ? `ステップ ${playback.index + 1} / ${timeline.steps.length}` : "完成形";

  return <main className={[styles.viewer, fullscreen && styles.fullscreen].filter(Boolean).join(" ")} data-fullscreen={fullscreen ? "" : undefined} id="origami-viewer">
    <div className={styles.top}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{model.name}</h1>
        {showControls && <p className={styles.step} role="status" aria-label="現在のステップ">{stepName}</p>}
        <p className={styles.description}>{description}</p>
      </div>
      <SidePanel className={styles.sidePanel} title="視点" triggerLabel="視点の操作">
        <div className={styles.zoom} role="group" aria-label="拡大率">
          <Button variant="secondary" size="sm" className={styles.zoomButton} aria-label="縮小" disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} text="−" />
          <output className={styles.zoomValue} aria-label="拡大率"><SearchIcon size={16} aria-hidden /><span>{Math.round(zoom * 100)}%</span></output>
          <Button variant="secondary" size="sm" className={styles.zoomButton} aria-label="拡大" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))} text="＋" />
        </div>
        <Button variant="secondary" text="視点をリセット" size="sm" className={styles.toolButton} onClick={() => { setZoom(1); setResetKey((value) => value + 1); }} />
        <p className={styles.hint}>ドラッグまたは矢印キーで回転、ホイールやピンチで拡大・縮小できます。</p>
      </SidePanel>
    </div>
    <div className={styles.stage}>
      <OrigamiCanvas
        size={model.procedure.size} color={model.color} step={step} progress={playback.progress}
        flatFinalBoards={model.procedure.finalBoards} finalBoards={timeline.finalBoards} finalViewFront={timeline.finalViewFront}
        resetKey={resetKey} zoom={zoom}
        label={`${model.name}・${stepName}・${description}。矢印キーで視点を回転できます。`}
      />
    </div>
    <div className={styles.bottom}>
      {showControls && <>
        <IconButton variant="floating" size="lg" icon="PreviousIcon" label="前へ" className={styles.previous} isDisabled={playback.index <= 0} onPress={() => playback.selectStep(playback.index - 1)} />
        <IconButton variant="floating" size="lg" icon="NextIcon" label="次へ" className={styles.next} isDisabled={playback.index >= timeline.steps.length - 1} onPress={() => playback.selectStep(playback.index + 1)} />
      </>}
      <FloatingPanel className={styles.panel}>{showControls ? <section className={styles.controls} aria-label="折り手順の操作">
        <div className={styles.bar}>
          <IconButton icon={playback.playing ? "StopIcon" : "PlayIcon"} label={playback.playing ? "一時停止" : playback.reducedMotion ? "このステップを完了" : "再生"} variant="primary" onPress={playback.togglePlaying} />
          <div className={styles.progress}>
            <Slider label="進み具合（%）" layout="inline" formatOptions={{ style: "unit", unit: "percent" }} minValue={0} maxValue={100} step={1} value={Math.round(playback.progress * 100)} onChange={(value) => playback.scrub(value / 100)} />
          </div>
        </div>
        <div className={styles.options} role="group" aria-label="再生の設定">
          <Checkbox label="移動したら自動再生" isSelected={playback.autoPlay} onChange={playback.setAutoPlay} />
          <Checkbox label="繰り返し再生" isSelected={playback.loop} isDisabled={playback.reducedMotion} onChange={playback.toggleLoop} />
        </div>
        {playback.reducedMotion && <p className={styles.hint}>動きを減らす設定に合わせて、再生は完成状態に切り替わります。</p>}
      </section> : <p className={styles.empty}>この作品には、まだ折り手順がありません。</p>}</FloatingPanel>
    </div>
  </main>;
}

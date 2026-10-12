"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Checkbox, FloatingPanel, IconButton, Pagination, SearchIcon, Slider } from "@oricube/design-system";
import type { OrigamiModelV2 } from "@/features/origami-viewer-v2/model";
import { OrigamiCanvas } from "./Canvas";
import { createViewerTimeline } from "./playback";
import { usePlayback } from "./usePlayback";
import styles from "./Viewer.module.css";
import { useViewerInsets } from "./useViewerInsets";

export interface OrigamiViewerProps {
  model: OrigamiModelV2;
  startAtEnd?: boolean;
}

export function OrigamiViewer({ model, startAtEnd = false }: OrigamiViewerProps) {
  const viewerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const insets = useViewerInsets(viewerRef, headingRef, bottomRef);
  const timeline = useMemo(() => createViewerTimeline(model.procedure), [model.procedure]);
  const [resetKey, setResetKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  const playback = usePlayback(timeline.steps.length, (index) => timeline.steps[index]?.kind === "flip", startAtEnd);
  const step = timeline.steps[playback.index];
  const description = step?.kind === "fold" ? model.stepDescriptions?.[step.sourceIndex] ?? step.label : step?.label ?? model.description;
  const showControls = timeline.steps.length > 0;
  const stepName = step ? `ステップ ${playback.index + 1} / ${timeline.steps.length}` : "完成形";

  return <main ref={viewerRef} className={styles.viewer} id="origami-viewer">
    <div ref={headingRef} className={styles.heading}>
      <div className={styles.title}>
        <div className={styles.titleRow}>
          <h1>{model.name}</h1>
          <p className={styles.step} role="status" aria-label="現在のステップ">{stepName}</p>
        </div>
        <p className={styles.description}>{description}</p>
      </div>
      <FloatingPanel className={styles.viewTools}>
        <div className={styles.views} role="group" aria-label="視点の操作">
          <Button variant="secondary" text="視点をリセット" size="sm" className={styles.toolButton} onClick={() => { setZoom(1); setResetKey((value) => value + 1); }} />
          <div className={styles.zoom} role="group" aria-label="拡大率">
            <Button variant="secondary" size="sm" className={styles.zoomButton} aria-label="縮小" disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} text="−" />
            <output className={styles.zoomValue} aria-label="拡大率"><SearchIcon size={16} aria-hidden /><span>{Math.round(zoom * 100)}%</span></output>
            <Button variant="secondary" size="sm" className={styles.zoomButton} aria-label="拡大" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))} text="＋" />
          </div>
        </div>
        <p className={styles.hint}>ドラッグまたは矢印キーで回転できます。</p>
      </FloatingPanel>
    </div>
    <div className={styles.stage}>
      <OrigamiCanvas
        size={model.procedure.size} color={model.color} step={step} progress={playback.progress}
        flatFinalBoards={model.procedure.finalBoards} finalBoards={timeline.finalBoards} finalViewFront={timeline.finalViewFront}
        resetKey={resetKey} zoom={zoom} insets={insets}
        label={`${model.name}・${stepName}・${description}。矢印キーで視点を回転できます。`}
      />
    </div>
    <div ref={bottomRef} className={styles.bottom}>
      {showControls ? <FloatingPanel><section className={styles.controls} aria-label="折り手順の操作">
        <div className={styles.playback}>
          <IconButton icon={playback.playing ? "StopIcon" : "PlayIcon"} label={playback.playing ? "一時停止" : playback.reducedMotion ? "このステップを完了" : "再生"} variant="primary" onPress={playback.togglePlaying} />
          <Slider label="進み具合（%）" layout="inline" formatOptions={{ style: "unit", unit: "percent" }} minValue={0} maxValue={100} step={1} value={Math.round(playback.progress * 100)} onChange={(value) => playback.scrub(value / 100)} />
        </div>
        <Pagination page={playback.index + 1} totalPages={timeline.steps.length} label="折り手順" currentType="step" getPageLabel={(page) => `ステップ ${page}・${timeline.steps[page - 1].label}`} onChange={(page) => playback.selectStep(page - 1)} />
        <div className={styles.settings} role="group" aria-label="再生の設定">
          <Checkbox label="ステップ移動時に自動再生" isSelected={playback.autoPlay} onChange={playback.setAutoPlay} />
          <Checkbox label="このステップを繰り返す" isSelected={playback.loop} isDisabled={playback.reducedMotion} onChange={playback.toggleLoop} />
        </div>
        {playback.reducedMotion && <p className={styles.hint}>動きを減らす設定に合わせて、再生は完成状態に切り替わります。</p>}
      </section></FloatingPanel> : <p className={styles.empty}>この作品には、まだ折り手順がありません。</p>}
    </div>
  </main>;
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, IconButton, Pagination, Slider } from "@oricube/design-system";
import type { OrigamiModelV2 } from "@/features/origami-viewer-v2/model";
import { OrigamiCanvas } from "./Canvas";
import { createViewerTimeline } from "./playback";
import { usePlayback } from "./usePlayback";
import type { CameraPreset } from "./scene";
import styles from "./Viewer.module.css";

export interface OrigamiViewerProps {
  model: OrigamiModelV2;
  completed?: boolean;
}

export function OrigamiViewer({ model, completed = false }: OrigamiViewerProps) {
  const timeline = useMemo(() => createViewerTimeline(model.procedure), [model.procedure]);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("front");
  const [resetKey, setResetKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  const playback = usePlayback(completed ? 0 : timeline.steps.length, (index) => timeline.steps[index]?.kind === "flip");
  const step = !completed ? timeline.steps[playback.index] : undefined;
  const description = step?.kind === "fold" ? model.stepDescriptions?.[step.sourceIndex] ?? step.label : step?.label ?? model.description;
  const showControls = !completed && timeline.steps.length > 0;
  const stepName = step ? `ステップ ${playback.index + 1} / ${timeline.steps.length}・${step.label}` : "完成形";

  return <main className={styles.viewer} id="origami-viewer">
    <div className={styles.title}>
      <div className={styles.titleRow}><h1>{model.name}</h1><Link className={styles.link} href={`/v2/${completed ? "view" : "detail"}/${model.id}`}>{completed ? "折り方を見る" : "完成形を見る"}</Link></div>
      <p className={styles.step} role="status" aria-label="現在のステップ">{stepName}</p>
      <p className={styles.description}>{description}</p>
    </div>
    <div className={styles.stage}>
      <OrigamiCanvas
        size={model.procedure.size} color={model.color} step={step} progress={playback.progress}
        flatFinalBoards={model.procedure.finalBoards} finalBoards={timeline.finalBoards} finalViewFront={timeline.finalViewFront}
        cameraPreset={cameraPreset} resetKey={resetKey} zoom={zoom}
        label={`${model.name}・${stepName}。矢印キーで視点を回転できます。`}
      />
    </div>
    <div className={styles.bottom}>
      <div className={styles.views} role="group" aria-label="視点の操作">
        <IconButton icon="RepeatIcon" label="視点を戻す" onPress={() => { setCameraPreset("front"); setZoom(1); setResetKey((value) => value + 1); }} />
        <Button variant="secondary" aria-pressed={cameraPreset === "angled"} onClick={() => setCameraPreset(cameraPreset === "front" ? "angled" : "front")} text={cameraPreset === "front" ? "斜めから見る" : "正面から見る"} />
        <Button variant="secondary" aria-label="縮小" disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} text="−" />
        <Button variant="secondary" aria-label="拡大" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))} text="＋" />
      </div>
      <p className={styles.hint}>ドラッグまたは矢印キーで回転できます。</p>
      {showControls ? <section className={styles.controls} aria-label="折り手順の操作">
        <div className={styles.playback}>
          <IconButton icon={playback.playing ? "StopIcon" : "PlayIcon"} label={playback.playing ? "一時停止" : playback.reducedMotion ? "このステップを完了" : "再生"} variant="primary" onPress={playback.togglePlaying} />
          <Slider label="進み具合（%）" minValue={0} maxValue={100} step={1} value={Math.round(playback.progress * 100)} onChange={(value) => playback.scrub(value / 100)} />
          <IconButton icon="RepeatIcon" label="このステップを繰り返す" selected={playback.loop} isDisabled={playback.reducedMotion} onPress={playback.toggleLoop} />
        </div>
        <Pagination page={playback.index + 1} totalPages={timeline.steps.length} label="折り手順" currentType="step" getPageLabel={(page) => `ステップ ${page}・${timeline.steps[page - 1].label}`} onChange={(page) => playback.selectStep(page - 1)} />
        {playback.reducedMotion && <p className={styles.hint}>動きを減らす設定に合わせて、再生は完成状態に切り替わります。</p>}
      </section> : !completed && <p className={styles.empty}>この作品には、まだ折り手順がありません。</p>}
    </div>
  </main>;
}

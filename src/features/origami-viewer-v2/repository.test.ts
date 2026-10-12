import { describe, expect, it } from "vitest";
import { createViewerTimeline, getStepBoards } from "@/components/v2/OrigamiViewer/playback";
import { getOrigamiV2 } from "./repository";

describe("V2閲覧用モック", () => {
  it("全4種類の折りと5回の裏返しを再生でき、表裏の羽の仕上げ角度が完成形に残る", async () => {
    const model = await getOrigamiV2("crane");
    if (!model) throw new Error("鶴のモックがありません");
    expect(new Set(model.procedure.steps.map((step) => step.kind))).toEqual(new Set(["fold", "squash", "petal", "insideReverse"]));
    const timeline = createViewerTimeline(model.procedure);
    expect(timeline.steps).toHaveLength(20);
    expect(timeline.finalBoards.some((board) => board.polygon.some((point) => point[2] > 1))).toBe(true);
    expect(timeline.finalBoards.some((board) => board.polygon.some((point) => point[2] < -1))).toBe(true);
    const saved = JSON.stringify(model);
    for (const step of timeline.steps) for (const progress of [0, 0.5, 1]) {
      expect(getStepBoards(step, progress).every((board) => board.polygon.every((point) => point.every(Number.isFinite)))).toBe(true);
    }
    expect(JSON.stringify(model)).toBe(saved);
  });
});

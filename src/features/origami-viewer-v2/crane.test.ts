import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { HistoryStepV2, PointV2 } from "@/types/model-v2";
import type { OrigamiStep } from "@/components/v2/OrigamiPost/types";
import { createSquareBoard } from "@/components/v2/OrigamiPost/utils/createSquareBoard";
import { exportProcedureV2 } from "@/components/v2/OrigamiPost/utils/exportProcedureV2";
import { replayFoldStepsDetailed } from "@/components/v2/OrigamiPost/utils/replayFoldSteps";
import { createViewerTimeline, getStepBoards } from "@/components/v2/OrigamiViewer/playback";
import { craneProcedure } from "./mocks/crane";

const vector = (point: PointV2) => new THREE.Vector3(...point);
const gesture = (step: HistoryStepV2): OrigamiStep => ({
  ...step,
  foldLine: { start: vector(step.foldLine.start), end: vector(step.foldLine.end) },
  dragVertex: vector(step.dragVertex),
});
const history = craneProcedure.history.map(gesture);
const displayedBoards = (count: number) => {
  const { boards, finishingRotations } = replayFoldStepsDetailed(createSquareBoard(100), history.slice(0, count));
  return boards.map((board) => {
    const rotation = finishingRotations.get(board);
    return { layer: board.layer, polygon: board.polygon.map((point) => rotation
      ? point.clone().sub(rotation.origin).applyAxisAngle(rotation.axis, rotation.angle - Math.PI).add(rotation.origin)
      : point) };
  });
};
const containsPoint = (count: number, point: PointV2) => displayedBoards(count).some((board) => board.polygon.some((vertex) => vertex.distanceTo(vector(point)) < 1e-6));

describe("鶴の完成形の回帰", () => {
  it("静的モックが投稿側から再エクスポートした答えデータと一致する", () => {
    expect(JSON.stringify(exportProcedureV2({ size: 100, steps: history }))).toBe(JSON.stringify(craneProcedure));
  });
  it("首と尾を胴体から起こし、頭を直角に折って両翼を付け根から開く", () => {
    expect(containsPoint(11, [-20, 50, 0])).toBe(true);
    expect(containsPoint(12, [50, -20, 0])).toBe(true);
    expect(containsPoint(13, [-20, 30, 0])).toBe(true);
    expect(containsPoint(13, [-20, 50, 0])).toBe(false);
    for (const wing of craneProcedure.steps.slice(13)) {
      expect(wing.targetAngle).toBeCloseTo(Math.PI / 2);
      expect(wing.foldLines[0].start[0] + wing.foldLines[0].start[1]).toBeCloseTo(0);
      expect(wing.foldLines[0].end[0] + wing.foldLines[0].end[1]).toBeCloseTo(0);
    }
  });
  it("全15回の折りの終点直前が、仕上げ角度も含めて投稿側の表示座標と一致する", () => {
    for (const step of createViewerTimeline(craneProcedure).steps) {
      if (step.kind !== "fold") continue;
      const expected = displayedBoards(step.sourceIndex + 1);
      const actual = getStepBoards(step, 1 - 1e-10);
      expect(actual).toHaveLength(expected.length);
      for (const board of actual) {
        expect(expected.some((candidate) => candidate.polygon.length === board.polygon.length
          && candidate.polygon.every((point, index) => point.distanceTo(vector(board.polygon[index])) < 1e-6))).toBe(true);
      }
    }
  });
  it("重なる表裏の羽を取り違えず、完成形の各レイヤーが投稿側の表示座標と一致する", () => {
    const actual = createViewerTimeline(craneProcedure).finalBoards;
    const expected = displayedBoards(history.length);
    expect(actual).toHaveLength(expected.length);
    for (const board of expected) {
      const candidate = actual.find((item) => item.layer === board.layer);
      expect(candidate).toBeDefined();
      if (!candidate) throw new Error(`完成形の layer ${board.layer} がありません`);
      expect(candidate.polygon).toHaveLength(board.polygon.length);
      board.polygon.forEach((point, index) => expect(point.distanceTo(vector(candidate.polygon[index]))).toBeLessThan(1e-6));
    }
  });
  it("全20ステップの終点と次の開始位置が、最後から戻っても同じになる", () => {
    const timeline = createViewerTimeline(craneProcedure);
    for (let index = timeline.steps.length - 2; index >= 0; index--) {
      const end = getStepBoards(timeline.steps[index], 1);
      const start = getStepBoards(timeline.steps[index + 1], 0);
      expect(end).toHaveLength(start.length);
      end.forEach((board, boardIndex) => {
        expect(board.layer).toBe(start[boardIndex].layer);
        expect(board.polygon).toHaveLength(start[boardIndex].polygon.length);
        board.polygon.forEach((point, vertexIndex) => expect(vector(point).distanceTo(vector(start[boardIndex].polygon[vertexIndex]))).toBeLessThan(1e-6));
      });
    }
  });
});

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { HistoryStepV2, PointV2, OrigamiStep } from "@oricube/engine";
import {
  createSquareBoard,
  exportProcedureV2,
  applyInsideReverseFoldStep,
  replayFoldStepsDetailed,
  createViewerTimeline,
  getStepBoards,
} from "@oricube/engine";
import { craneProcedure } from "./crane";

const vector = (point: PointV2) => new THREE.Vector3(...point);
type FoldHistoryStep = Exclude<HistoryStepV2, { kind: "flip" }>;
const gesture = (step: FoldHistoryStep): OrigamiStep => ({
  ...step,
  foldLine: { start: vector(step.foldLine.start), end: vector(step.foldLine.end) },
  dragVertex: vector(step.dragVertex),
});
const history = craneProcedure.history.filter((step): step is FoldHistoryStep => step.kind !== "flip").map(gesture);
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
  it("静的モック（version 2）と投稿側から再エクスポートした答えデータ（version 3）が同じ折り方を表す", () => {
    const exported = exportProcedureV2({ size: 100, steps: history });
    if (!exported) throw new Error("鶴の手順を書き出せません");
    expect(exported.version).toBe(3);
    expect(JSON.stringify(exported.steps)).toBe(JSON.stringify(craneProcedure.steps));
    expect(JSON.stringify(exported.finalBoards)).toBe(JSON.stringify(craneProcedure.finalBoards));
    expect(JSON.stringify(exported.history.filter((step) => step.kind !== "flip"))).toBe(JSON.stringify(craneProcedure.history));
    // version 2 は表裏の変化から推定し、version 3 は保存した裏返しを再生する。どちらも同じ手順の並びになる
    const kinds = (procedure: typeof craneProcedure) => createViewerTimeline(procedure).steps.map((step) => `${step.kind}:${step.viewFront}`);
    expect(kinds(exported)).toEqual(kinds(craneProcedure));
  });
  it("UIで記録した尾・首・頭の位置と両翼の仕上げ角度を保つ", () => {
    expect(containsPoint(11, [4.241352874050861, -26.79849817701443, 0])).toBe(true);
    expect(containsPoint(12, [26.62168681954975, -4.259332533907191, 0])).toBe(true);
    expect(containsPoint(15, [25.404928761707037, 15.259662707026305, 0])).toBe(true);
    expect(craneProcedure.steps.slice(12, 14).map((step) => step.targetAngle)).toEqual([Math.PI * 5 / 6, Math.PI * 5 / 6]);
    expect(history.map((step) => step.viewFront)).toEqual([false, false, false, true, true, false, true, true, false, false, false, false, false, true, true]);
    expect(new Set(craneProcedure.finalBoards.map((board) => board.layer)).size).toBe(craneProcedure.finalBoards.length);
  });
  it.each([11, 12, 15])("尾・首・頭の中割り後も表裏の外側に色紙の面が見える: %s", (count) => {
    const step = history[count - 1];
    if (step.kind !== "insideReverse") throw new Error("中割り折りの手順ではありません");
    const before = replayFoldStepsDetailed(createSquareBoard(100), history.slice(0, count - 1)).boards;
    const result = applyInsideReverseFoldStep(before, step);
    if (!result) throw new Error("中割り折りが成立していません");
    const tips = result.boards.filter((board) => !result.staticBoards.includes(board)).sort((a, b) => b.layer - a.layer);
    const first = tips[0]; const last = tips.at(-1);
    if (!first || !last) throw new Error("先端の片がありません");
    const clockwise = (polygon: THREE.Vector3[]) => THREE.ShapeUtils.isClockWise(polygon.map((point) => new THREE.Vector2(point.x, point.y)));
    expect(clockwise(first.polygon)).toBe(false);
    expect(clockwise(last.polygon)).toBe(true);
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
  it("全21ステップの終点と次の開始位置が、最後から戻っても同じになる", () => {
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

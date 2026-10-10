import type { PointV2, ProcedureV2 } from "@/types/model-v2";
import { describe, expect, it } from "vitest";
import { exportProcedureV2 } from "../OrigamiPost/utils/exportProcedureV2";
import { craneNarrowedLegsSteps } from "../OrigamiPost/utils/replayFoldSteps/craneFixture";
import { replayFoldSteps } from "../OrigamiPost/utils/replayFoldSteps";
import { createSquareBoard } from "../OrigamiPost/utils/createSquareBoard";
import { createViewerTimeline, getStepBoards, getViewAngle } from "./playback";

const crane = () => {
  const procedure = exportProcedureV2({ size: 100, steps: craneNarrowedLegsSteps });
  if (!procedure) throw new Error("鶴のフィクスチャをエクスポートできません");
  return procedure;
};

describe("V2閲覧用タイムライン", () => {
  it("表裏の切り替えを独立したステップにし、元データを変更しない", () => {
    const procedure = crane();
    const saved = JSON.stringify(procedure);
    const timeline = createViewerTimeline(procedure);
    expect(timeline.steps.filter((step) => step.kind === "flip")).toHaveLength(3);
    expect(timeline.steps).toHaveLength(13);
    expect(timeline.steps[3].kind).toBe("flip");
    expect(JSON.stringify(procedure)).toBe(saved);
    const flip = timeline.steps[3];
    expect(getStepBoards(flip, 0)).toEqual(getStepBoards(flip, 1));
    expect(getViewAngle(flip, 1) - getViewAngle(flip, 0)).toBeCloseTo(Math.PI);
  });
  it("全種類の折りを保存済みの回転軸だけで再生すると投稿側の完成座標と一致する", () => {
    const procedure = crane();
    for (const step of createViewerTimeline(procedure).steps) {
      if (step.kind !== "fold") continue;
      const expected = replayFoldSteps(createSquareBoard(100), craneNarrowedLegsSteps.slice(0, step.sourceIndex + 1));
      const actual = getStepBoards(step, 1 - 1e-10);
      expect(actual).toHaveLength(expected.length);
      for (const board of actual) {
        expect(expected.some((candidate) => candidate.polygon.length === board.polygon.length && candidate.polygon.every((point, index) => point.distanceTo({ x: board.polygon[index][0], y: board.polygon[index][1], z: board.polygon[index][2] }) < 1e-6))).toBe(true);
      }
    }
  });
  it("最初から裏面を見る手順にも裏返しを表示し、履歴が空でも折りは再生できる", () => {
    const procedure = crane();
    procedure.history[0].viewFront = false;
    expect(createViewerTimeline(procedure).steps[0].kind).toBe("flip");
    procedure.history = [];
    expect(createViewerTimeline(procedure).steps).toHaveLength(procedure.steps.length);
  });
  it("180度未満の仕上げ角度を、次の固定板と完成形にも保持する", () => {
    const procedure = crane();
    const index = procedure.steps.length - 1;
    procedure.steps[index].targetAngle = Math.PI * 5 / 6;
    const timeline = createViewerTimeline(procedure);
    const last = timeline.steps[timeline.steps.length - 1];
    const moved = getStepBoards(last, 1);
    expect(moved.some((board) => board.polygon.some((point) => Math.abs(point[2]) > 1))).toBe(true);
    expect(timeline.finalBoards.some((board) => board.polygon.some((point) => Math.abs(point[2]) > 1))).toBe(true);
  });
  it("100%では次の手順の開始状態と同じ重なり順に確定する", () => {
    const timeline = createViewerTimeline(crane());
    for (let index = 0; index < timeline.steps.length - 1; index++) {
      const end = getStepBoards(timeline.steps[index], 1);
      const start = getStepBoards(timeline.steps[index + 1], 0);
      expect(end).toHaveLength(start.length);
      end.forEach((board, boardIndex) => {
        expect(board.layer).toBe(start[boardIndex].layer);
        board.polygon.forEach((point, vertexIndex) => point.forEach((value, axis) => expect(value).toBeCloseTo(start[boardIndex].polygon[vertexIndex][axis], 6)));
      });
    }
  });
  it("手順のない作品には完成形だけを返す", () => {
    const procedure = crane();
    procedure.steps = [];
    procedure.history = [];
    expect(createViewerTimeline(procedure).steps).toEqual([]);
    expect(createViewerTimeline(procedure).finalBoards).toEqual(procedure.finalBoards);
  });
  it("平面上で重なる表裏の羽を、異なるレイヤーと逆向きの仕上げ姿勢で保持する", () => {
    const polygon: PointV2[] = [[0, 0, 0], [-20, 0, 0], [0, 20, 0]];
    const reflected: PointV2[] = [[0, 0, 0], [20, 0, 0], [0, 20, 0]];
    const move = (layer: number, direction: PointV2) => ({ polygon, layer, vertexAxes: polygon.map(() => [{ origin: [0, 0, 0] satisfies PointV2, direction }]) });
    const procedure: ProcedureV2 = {
      version: 2, size: 100, history: [],
      steps: [
        { kind: "fold", fixBoards: [{ polygon, layer: 1 }], moveBoards: [move(0, [0, 1, 0])], foldLines: [], targetAngle: Math.PI / 2 },
        { kind: "fold", fixBoards: [{ polygon: reflected, layer: 2 }], moveBoards: [move(1, [0, -1, 0])], foldLines: [], targetAngle: Math.PI / 2 },
      ],
      finalBoards: [{ polygon: reflected, layer: 2 }, { polygon: reflected, layer: 3 }],
    };
    const timeline = createViewerTimeline(procedure);
    expect(timeline.finalBoards[0].polygon[1][2]).toBeCloseTo(20);
    expect(timeline.finalBoards[1].polygon[1][2]).toBeCloseTo(-20);
    expect(getStepBoards(timeline.steps[1], 1)).toEqual(timeline.finalBoards);
  });

});

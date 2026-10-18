import { describe, expect, it } from "vitest";
import type { ProcedureV2 } from "./model-v2";
import { createProcedureThumbnail } from "./thumbnail";
import { exportProcedureV2 } from "./utils/exportProcedureV2";
import { craneNarrowedLegsSteps } from "./utils/replayFoldSteps/craneFixture";

const sheet = (polygon: ProcedureV2["finalBoards"][number]["polygon"]): ProcedureV2 => ({
  version: 2, size: 100, steps: [], history: [], finalBoards: [{ polygon, layer: 0 }],
});

describe("完成形のサムネイル", () => {
  it("折る前の紙は表を向いた正方形を、余白付きの正方形の範囲に収める", () => {
    const thumbnail = createProcedureThumbnail(sheet([[-50, -50, 0], [50, -50, 0], [50, 50, 0], [-50, 50, 0]]));
    expect(thumbnail.faces).toEqual([{ points: [[-50, 50], [50, 50], [50, -50], [-50, -50]], side: "front", shade: 1 }]);
    expect(thumbnail.viewBox).toEqual([-58, -58, 116, 116]);
  });

  it("頂点の並びが逆の面は裏面として扱う", () => {
    const thumbnail = createProcedureThumbnail(sheet([[-50, 50, 0], [50, 50, 0], [50, -50, 0], [-50, -50, 0]]));
    expect(thumbnail.faces[0].side).toBe("back");
  });

  it("鶴は表裏の面を含み、すべての点が表示範囲に収まる", () => {
    const procedure = exportProcedureV2({ size: 100, steps: craneNarrowedLegsSteps });
    if (!procedure) throw new Error("鶴のフィクスチャをエクスポートできません");
    const saved = JSON.stringify(procedure);
    const { faces, viewBox: [x, y, width, height] } = createProcedureThumbnail(procedure);
    expect(faces).toHaveLength(procedure.finalBoards.length);
    expect(new Set(faces.map((face) => face.side))).toEqual(new Set(["front", "back"]));
    for (const point of faces.flatMap((face) => face.points)) {
      expect(point[0]).toBeGreaterThanOrEqual(x);
      expect(point[0]).toBeLessThanOrEqual(x + width);
      expect(point[1]).toBeGreaterThanOrEqual(y);
      expect(point[1]).toBeLessThanOrEqual(y + height);
    }
    expect(JSON.stringify(procedure)).toBe(saved);
  });
});

import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { computeFoldPreview } from "../../utils/computeFoldPreview";
import { createSquareBoard } from "../../utils/createSquareBoard";
import { replayFoldSteps } from "../../utils/replayFoldSteps";
import { craneNarrowedLegsSteps } from "../../utils/replayFoldSteps/craneFixture";
import { renderFoldPreview, removeFoldPreview } from "./renderFoldPreview";

const v = (x: number, y: number) => new THREE.Vector3(x, y, 0);

describe("renderFoldPreview", () => {
  it("開いて畳んだ面のドラッグで左右を描き、移動・終了時には前の表示を破棄する", () => {
    const scene = new THREE.Scene();
    const boards = replayFoldSteps(createSquareBoard(100), craneNarrowedLegsSteps.slice(0, 3));
    const preview = computeFoldPreview({
      boards, dragVertex: v(50, 50), draggedPosition: v(25, 25), viewFront: true,
    });
    expect(preview).not.toBeNull();
    if (!preview) return;

    renderFoldPreview({ scene, preview, origamiColor: "#4A90E2" });
    const group = scene.getObjectByName("foldPreviewBoard");
    expect(group?.children).toHaveLength(2);
    if (!group) return;
    const disposals: ReturnType<typeof vi.spyOn>[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        disposals.push(vi.spyOn(child.geometry, "dispose"));
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) disposals.push(vi.spyOn(material, "dispose"));
      }
    });

    renderFoldPreview({ scene, preview, origamiColor: "#4A90E2" });
    expect(scene.children.filter((child) => child.name === "foldPreviewBoard")).toHaveLength(1);
    expect(scene.getObjectByName("foldPreviewBoard")).not.toBe(group);
    for (const dispose of disposals) expect(dispose).toHaveBeenCalled();
    expect(scene.getObjectByName("foldLinePreview")).toBeDefined();

    removeFoldPreview(scene);
    expect(scene.children).toHaveLength(0);
    removeFoldPreview(scene);
    expect(scene.children).toHaveLength(0);
  });
});

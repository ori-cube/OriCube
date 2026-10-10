import * as THREE from "three";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { OrigamiPostV2 } from "./index";
import type { OrigamiStep } from "./types";

vi.mock("./hooks", () => ({ useInitScene: () => vi.fn(), useDragDrop: () => ({ confirmFold: vi.fn(), cancelFold: vi.fn() }), useFoldAnimation: vi.fn(), useFlipView: () => ({ flipView: vi.fn(), isFlipping: false }), useViewMode: () => ({ toggleViewMode: vi.fn() }), useCameraFocus: vi.fn() }));

it("復元した手順をUndo/Redoし、確定済みの履歴と色を外へ通知する", () => {
  const step: OrigamiStep = { kind: "fold", foldLine: { start: new THREE.Vector3(-50, -50, 0), end: new THREE.Vector3(50, 50, 0) }, dragVertex: new THREE.Vector3(-50, 50, 0), foldCount: 1, viewFront: true };
  const changed = vi.fn();
  render(<OrigamiPostV2 initialSteps={[step]} onStateChange={changed} width={800} height={600} />);
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [step], busy: false }));
  fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [] }));
  fireEvent.click(screen.getByRole("button", { name: "やり直す" }));
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [step] }));
  fireEvent.change(screen.getByLabelText("折り紙の色"), { target: { value: "#44aabb" } });
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [step], color: "#44aabb" }));
});

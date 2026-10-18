import * as THREE from "three";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { OrigamiPostV2 } from "./index";
import type { OrigamiStep } from "@oricube/engine";

vi.mock("./hooks", () => ({ useInitScene: () => vi.fn(), useDragDrop: () => ({ confirmFold: vi.fn(), cancelFold: vi.fn() }), useFoldAnimation: vi.fn(), useFlipView: () => ({ flipView: vi.fn(), isFlipping: false }), useViewMode: () => ({ toggleViewMode: vi.fn() }), useCameraFocus: vi.fn() }));

it("復元した手順をUndo/Redoし、確定済みの履歴と色を外へ通知する", () => {
  const step: OrigamiStep = { kind: "fold", foldLine: { start: new THREE.Vector3(-50, -50, 0), end: new THREE.Vector3(50, 50, 0) }, dragVertex: new THREE.Vector3(-50, 50, 0), foldCount: 1, viewFront: true };
  const changed = vi.fn();
  const { rerender } = render(<OrigamiPostV2 initialSteps={[step]} onStateChange={changed} width={800} height={600} />);
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [step], busy: false, phase: "idle" }));
  fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [] }));
  fireEvent.click(screen.getByRole("button", { name: "やり直す" }));
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [step] }));
  rerender(<OrigamiPostV2 initialSteps={[step]} onStateChange={changed} width={800} height={600} color="#44AABB" />);
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [step], color: "#44AABB" }));
});

it("Ctrl+Z・Ctrl+Shift+Zで元に戻し・やり直し、文字入力中は反応しない", () => {
  const step: OrigamiStep = { kind: "fold", foldLine: { start: new THREE.Vector3(-50, -50, 0), end: new THREE.Vector3(50, 50, 0) }, dragVertex: new THREE.Vector3(-50, 50, 0), foldCount: 1, viewFront: true };
  const changed = vi.fn();
  render(<><input aria-label="作品名" /><OrigamiPostV2 initialSteps={[step]} onStateChange={changed} width={800} height={600} /></>);
  fireEvent.keyDown(screen.getByRole("textbox", { name: "作品名" }), { key: "z", ctrlKey: true });
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [step] }));
  fireEvent.keyDown(window, { key: "z", ctrlKey: true });
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [] }));
  fireEvent.keyDown(window, { key: "Z", metaKey: true, shiftKey: true });
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ steps: [step] }));
});

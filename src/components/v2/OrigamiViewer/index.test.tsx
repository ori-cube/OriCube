import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrigamiViewer } from "./index";
import type { OrigamiCanvasProps } from "./Canvas";
import { getOrigamiV2 } from "@/features/origami-viewer-v2/repository";

vi.mock("./Canvas", () => ({ OrigamiCanvas: function Canvas(props: OrigamiCanvasProps) { return <div role="img" aria-label={props.label} data-progress={props.progress} data-reset={props.resetKey} data-zoom={props.zoom} data-preset={props.cameraPreset} />; } }));
const frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
const advance = (time: number) => act(() => {
  const pending = Array.from(frames.values());
  frames.clear();
  pending.forEach((callback) => callback(time));
});
beforeEach(() => {
  frames.clear(); nextId = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })); });
afterEach(() => vi.unstubAllGlobals());

describe("V2閲覧画面", () => {
  it("折り方を表示し、ページ送りとスライダーで操作できる", async () => {
    const model = await getOrigamiV2("crane");
    if (!model) throw new Error("モックがありません");
    render(<OrigamiViewer model={model} />);
    expect(screen.getByRole("heading", { name: "鶴" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText("対角線に沿って半分に折ります。")).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "進み具合（%）" });
    fireEvent.keyDown(slider, { key: "End" });
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "1");
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0");
    expect(screen.getByText("もう一度半分に折ります。")).toBeInTheDocument();
  });
  it("裏返しを単独のステップとして表示する", async () => {
    const model = await getOrigamiV2("crane");
    if (!model) throw new Error("モックがありません");
    render(<OrigamiViewer model={model} />);
    expect(screen.getByRole("status", { name: "現在のステップ" })).toHaveTextContent("ステップ 1 / 21・裏返して裏側を向ける");
    expect(screen.getByText("裏返して裏側を向ける")).toBeInTheDocument();
  });
  it("完成形は同じ閲覧画面の最終ステップで確認し、前へ戻れる", async () => {
    const model = await getOrigamiV2("crane");
    if (!model) throw new Error("モックがありません");
    render(<OrigamiViewer model={model} startAtEnd />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "現在のステップ" })).toHaveTextContent("ステップ 21 / 21");
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "1");
    expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "前へ" }));
    expect(screen.getByRole("status", { name: "現在のステップ" })).toHaveTextContent("ステップ 20 / 21");
  });
  it("自動再生を選んで次へ移動すると再生し、解除すると停止状態で移動する", async () => {
    const model = await getOrigamiV2("crane");
    if (!model) throw new Error("モックがありません");
    render(<OrigamiViewer model={model} />);
    const checkbox = screen.getByRole("checkbox", { name: "ステップ移動時に自動再生" });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByRole("button", { name: "一時停止" })).toBeInTheDocument();
    advance(0); advance(1000);
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0.5");
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByRole("button", { name: "再生" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("data-progress", "0");
  });
  it("拡大率を表示し、文字付きのリセットで視点と倍率を戻す", async () => {
    const model = await getOrigamiV2("crane");
    if (!model) throw new Error("モックがありません");
    render(<OrigamiViewer model={model} />);
    expect(screen.getByRole("status", { name: "拡大率" })).toHaveTextContent("100%");
    fireEvent.click(screen.getByRole("button", { name: "拡大" }));
    expect(screen.getByRole("status", { name: "拡大率" })).toHaveTextContent("125%");
    fireEvent.click(screen.getByRole("button", { name: "斜めから見る" }));
    fireEvent.click(screen.getByRole("button", { name: "視点をリセット" }));
    expect(screen.getByRole("status", { name: "拡大率" })).toHaveTextContent("100%");
    expect(screen.getByRole("img")).toHaveAttribute("data-zoom", "1");
    expect(screen.getByRole("img")).toHaveAttribute("data-preset", "front");
    expect(screen.getByRole("img")).toHaveAttribute("data-reset", "1");
  });
  it("手順が空の作品と見つからない作品を区別する", async () => {
    const model = await getOrigamiV2("blank-paper");
    if (!model) throw new Error("モックがありません");
    render(<OrigamiViewer model={model} />);
    expect(screen.getByText("この作品には、まだ折り手順がありません。")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(await getOrigamiV2("unknown")).toBeNull();
  });
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrigamiViewer } from "./index";
import type { OrigamiCanvasProps } from "./Canvas";
import { getOrigamiV2 } from "@/features/origami-viewer-v2/repository";

vi.mock("./Canvas", () => ({ OrigamiCanvas: function Canvas(props: OrigamiCanvasProps) { return <div role="img" aria-label={props.label} data-progress={props.progress} data-reset={props.resetKey} />; } }));
beforeEach(() => { vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })); });
afterEach(() => vi.unstubAllGlobals());

describe("V2閲覧画面", () => {
  it("折り方を表示し、ページ送りとスライダーで操作できる", async () => {
    const model = await getOrigamiV2("crane");
    if (!model) throw new Error("モックがありません");
    render(<OrigamiViewer model={model} />);
    expect(screen.getByRole("heading", { name: "鶴" })).toBeInTheDocument();
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
    const next = screen.getByRole("button", { name: "次へ" });
    fireEvent.click(next); fireEvent.click(next); fireEvent.click(next);
    expect(screen.getByRole("status", { name: "現在のステップ" })).toHaveTextContent("ステップ 4 / 20・裏返して裏側を向ける");
    expect(screen.getByText("裏返して裏側を向ける")).toBeInTheDocument();
  });
  it("完成形では再生を始めず、折り方へのリンクを表示する", async () => {
    const model = await getOrigamiV2("crane");
    if (!model) throw new Error("モックがありません");
    render(<OrigamiViewer model={model} completed />);
    expect(screen.getByRole("link", { name: "折り方を見る" })).toHaveAttribute("href", "/v2/view/crane");
    expect(screen.queryByRole("button", { name: "再生" })).not.toBeInTheDocument();
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

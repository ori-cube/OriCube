import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayback } from "./usePlayback";

const frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
let reduced = false;
const advance = (time: number) => act(() => {
  const pending = Array.from(frames.values());
  frames.clear();
  pending.forEach((callback) => callback(time));
});
beforeEach(() => {
  frames.clear(); nextId = 0; reduced = false;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const renderPlayback = () => renderHook(() => usePlayback(13, (index) => index === 3));

describe("V2閲覧の再生操作", () => {
  it("表示しただけでは再生せず、再生と一時停止ができる", () => {
    const { result } = renderPlayback();
    expect(frames.size).toBe(0);
    act(() => result.current.togglePlaying());
    advance(0); advance(1000);
    expect(result.current.progress).toBeCloseTo(0.5);
    act(() => result.current.togglePlaying());
    expect(result.current.playing).toBe(false);
    expect(frames.size).toBe(0);
  });
  it("終点で停止し、再度再生すると最初から始める", () => {
    const { result } = renderPlayback();
    act(() => result.current.togglePlaying());
    advance(0); advance(2000); advance(2016);
    expect(result.current.progress).toBe(1);
    expect(result.current.playing).toBe(false);
    act(() => result.current.togglePlaying());
    expect(result.current.progress).toBe(0);
    expect(result.current.playing).toBe(true);
  });
  it("繰り返しは終点で1秒待って同じステップを再生する", () => {
    const { result } = renderPlayback();
    act(() => result.current.toggleLoop());
    act(() => result.current.togglePlaying());
    advance(0); advance(2000); advance(3000);
    expect(result.current.progress).toBe(0);
    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(true);
  });
  it("裏返しも独立して選択でき、800msで再生する", () => {
    const { result } = renderPlayback();
    act(() => result.current.selectStep(3));
    act(() => result.current.togglePlaying());
    advance(0); advance(400);
    expect(result.current.progress).toBeCloseTo(0.5);
    act(() => result.current.selectStep(4));
    expect(result.current.progress).toBe(0);
    expect(result.current.playing).toBe(false);
    expect(frames.size).toBe(0);
  });
  it("スライダー操作では再生を止めて選んだ位置を保つ", () => {
    const { result } = renderPlayback();
    act(() => result.current.togglePlaying());
    act(() => result.current.scrub(0.75));
    expect(result.current.playing).toBe(false);
    expect(result.current.progress).toBe(0.75);
    expect(frames.size).toBe(0);
  });
  it("非表示中は止まり、復帰時に経過時間を飛ばさない", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const { result } = renderPlayback();
    act(() => result.current.togglePlaying());
    advance(0); advance(500);
    hidden.mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(frames.size).toBe(0);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    advance(10000);
    expect(result.current.progress).toBeCloseTo(0.25);
    advance(10500);
    expect(result.current.progress).toBeCloseTo(0.5);
  });
  it("動きを減らす設定ではアニメーションせず完了状態を表示する", () => {
    reduced = true;
    const { result } = renderPlayback();
    act(() => result.current.togglePlaying());
    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.progress).toBe(1);
    expect(frames.size).toBe(0);
  });
  it("画面を離れたら再生フレームをキャンセルする", () => {
    const { result, unmount } = renderPlayback();
    act(() => result.current.togglePlaying());
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });
});

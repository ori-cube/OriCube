import { useEffect } from "react";
import * as THREE from "three";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { OrigamiPostV2Props } from "../../components/OrigamiPost";
import type { OrigamiViewerProps } from "../../components/OrigamiViewer";
import { exportProcedureV2 } from "@oricube/engine";
import { MOCK_DRAFT_KEY, serializeMockDraft } from "./mockAuthoring";
import { MockWorkshop } from "./MockWorkshop";

const files = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("./mockAuthoring", async (original) => ({ ...await original<typeof import("./mockAuthoring")>(), saveMockFile: files.save }));
vi.mock("../../components/OrigamiPost", () => ({ OrigamiPostV2: function Editor({ initialSteps = [], onStateChange, color = "#ed7070", cameraPosition }: OrigamiPostV2Props) {
  useEffect(() => { onStateChange?.({ steps: initialSteps, color, viewFront: (cameraPosition?.z ?? 1) >= 0, busy: false, phase: "idle" }); }, [initialSteps, color, onStateChange, cameraPosition?.z]);
  return <>
    <span aria-label="紙の色">{color}</span>
    <button onClick={() => onStateChange?.({ steps: [...initialSteps, { kind: "fold", foldLine: { start: new THREE.Vector3(-50, -50, 0), end: new THREE.Vector3(50, 50, 0) }, dragVertex: new THREE.Vector3(-50, 50, 0), foldCount: 1, viewFront: true }], color, viewFront: false, busy: false, phase: "idle" })}>頂点を折る</button>
    <button onClick={() => onStateChange?.({ steps: initialSteps, color, viewFront: true, busy: true, phase: "selecting" })}>折り方を選ぶ</button>
  </>;
} }));
vi.mock("../../components/OrigamiViewer", () => ({ OrigamiViewer: function Preview({ model, startAtEnd }: OrigamiViewerProps) { return <div aria-label="プレビュー">{startAtEnd ? "完成形" : "折り方"}・{model.procedure.steps.length}回</div>; } }));
const openPanel = () => fireEvent.click(screen.getByRole("button", { name: "作品の設定と保存" }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); });
afterEach(() => vi.unstubAllGlobals());

describe("モック作成画面", () => {
  it("UIで確定した手順を自動保存し、同じデータで確認・書き出しできる", async () => {
    render(<MockWorkshop />);
    fireEvent.click(await screen.findByRole("button", { name: "頂点を折る" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1回の折りを記録"));
    const saved: unknown = JSON.parse(localStorage.getItem(MOCK_DRAFT_KEY) ?? "null");
    expect(saved).toMatchObject({ editorViewFront: false, procedure: { history: [{ kind: "fold" }] } });
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "JSONを保存" }));
    expect(files.save).toHaveBeenCalledWith("crane.json", localStorage.getItem(MOCK_DRAFT_KEY));
    fireEvent.click(screen.getByRole("button", { name: "モック用TSを保存" }));
    expect(files.save).toHaveBeenCalledWith("recorded-crane.ts", expect.stringContaining("recordedCraneModel"));
    fireEvent.click(screen.getByRole("button", { name: "完成形を確認" }));
    expect(screen.getByLabelText("プレビュー")).toHaveTextContent("完成形・1回");
    fireEvent.click(screen.getByRole("button", { name: "折り方を確認" }));
    expect(screen.getByLabelText("プレビュー")).toHaveTextContent("折り方・1回");
    fireEvent.click(screen.getByRole("button", { name: "折る画面に戻る" }));
    expect(screen.getByRole("status")).toHaveTextContent("1回の折りを記録");
  });
  it("折り操作のフェーズに合わせて次にすることを案内する", async () => {
    render(<MockWorkshop />);
    expect(await screen.findByText("頂点をドラッグして、重ねたい位置で離すと折れます")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "折り方を選ぶ" }));
    expect(screen.getByText("折り方を選んで「折る」を押します")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("操作中");
  });
  it("引き出しで選んだ紙の色を折る画面に反映し、空にしても直前の色を保つ", async () => {
    render(<MockWorkshop />);
    await screen.findByRole("button", { name: "頂点を折る" });
    openPanel();
    const input = screen.getByRole("textbox", { name: "折り紙の色" });
    fireEvent.change(input, { target: { value: "#44aabb" } });
    fireEvent.blur(input);
    expect(screen.getByLabelText("紙の色")).toHaveTextContent("#44AABB");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(screen.getByLabelText("紙の色")).toHaveTextContent("#44AABB");
  });
  it("ページを開き直しても下書きを復元する", async () => {
    const procedure = exportProcedureV2({ size: 100, steps: [] });
    if (!procedure) throw new Error("白紙のデータがありません");
    localStorage.setItem(MOCK_DRAFT_KEY, serializeMockDraft({ model: { id: "crane", name: "私の鶴", description: "", color: "#44aabb", procedure }, viewFront: true }));
    render(<MockWorkshop />);
    await screen.findByRole("button", { name: "頂点を折る" });
    expect(screen.getByRole("status")).toHaveTextContent("保存した手順を復元");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("私の鶴");
    openPanel();
    expect(screen.getByRole("textbox", { name: "作品名" })).toHaveValue("私の鶴");
  });
  it("読み込めない保存済み下書きを白紙で上書きしない", async () => {
    localStorage.setItem(MOCK_DRAFT_KEY, "invalid");
    render(<MockWorkshop />);
    expect(await screen.findByRole("alert")).toHaveTextContent("上書きを止めています");
    expect(localStorage.getItem(MOCK_DRAFT_KEY)).toBe("invalid");
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "白紙に戻す" }));
    await waitFor(() => expect(localStorage.getItem(MOCK_DRAFT_KEY)).not.toBe("invalid"));
  });
  it("不正なJSONの読み込みで現在の手順を失わない", async () => {
    const { container } = render(<MockWorkshop />);
    fireEvent.click(await screen.findByRole("button", { name: "頂点を折る" }));
    const input = container.querySelector('input[type="file"]');
    if (!input) throw new Error("ファイル選択がありません");
    const file = new File(["invalid"], "invalid.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("invalid") });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1回の折りを記録");
  });
});

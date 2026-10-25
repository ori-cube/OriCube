import { forwardRef, useEffect, useImperativeHandle, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { createApp } from "@oricube/api";
import type { OrigamiCanvasHandle, OrigamiCanvasProps } from "../../components/OrigamiViewer/Canvas";
import { AuthContext, unavailableAuth, type AuthState } from "../../auth/AuthContext";
import * as THREE from "three";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { OrigamiPostV2Props } from "../../components/OrigamiPost";
import type { OrigamiViewerProps } from "../../components/OrigamiViewer";
import { exportProcedureV2 } from "@oricube/engine";
import { DRAFT_KEY, serializeDraft } from "./draft";
import { PostEditor } from "./PostEditor";

vi.mock("../../components/OrigamiPost", () => ({ OrigamiPostV2: function Editor({ initialSteps = [], onStateChange, color = "#ed7070", cameraPosition }: OrigamiPostV2Props) {
  useEffect(() => { onStateChange?.({ steps: initialSteps, color, viewFront: (cameraPosition?.z ?? 1) >= 0, busy: false, phase: "idle" }); }, [initialSteps, color, onStateChange, cameraPosition?.z]);
  return <>
    <span aria-label="紙の色">{color}</span>
    <button onClick={() => onStateChange?.({ steps: [...initialSteps, { kind: "fold", foldLine: { start: new THREE.Vector3(-50, -50, 0), end: new THREE.Vector3(50, 50, 0) }, dragVertex: new THREE.Vector3(-50, 50, 0), foldCount: 1, viewFront: true }], color, viewFront: false, busy: false, phase: "idle" })}>頂点を折る</button>
    <button onClick={() => onStateChange?.({ steps: initialSteps, color, viewFront: true, busy: true, phase: "selecting" })}>折り方を選ぶ</button>
  </>;
} }));
vi.mock("../../components/OrigamiViewer", () => ({ OrigamiViewer: function Preview({ model, startAtEnd }: OrigamiViewerProps) { return <div aria-label="プレビュー">{startAtEnd ? "完成形" : "折り方"}・{model.procedure.steps.length}回</div>; } }));
const rotateModel = vi.hoisted(() => vi.fn());
const getModelRotation = vi.hoisted(() => vi.fn());
vi.mock("../../components/OrigamiViewer/Canvas", () => ({ OrigamiCanvas: forwardRef<OrigamiCanvasHandle, OrigamiCanvasProps>(function Camera({ label }, ref) {
  useImperativeHandle(ref, () => ({ rotateModel, getModelRotation }));
  return <div role="img" aria-label={label} />;
}) }));
const openPanel = () => fireEvent.click(screen.getByRole("button", { name: "作品の設定" }));
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); });
afterEach(() => vi.unstubAllGlobals());

describe("投稿画面", () => {
  it("確定した手順を自動保存し、同じデータで確認できる", async () => {
    render(<PostEditor />);
    fireEvent.click(await screen.findByRole("button", { name: "頂点を折る" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1回の折りを記録"));
    const saved: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    expect(saved).toMatchObject({ editorViewFront: false, procedure: { history: [{ kind: "fold" }] } });
    openPanel();
    expect(screen.queryByRole("button", { name: /JSON|TS/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "完成形を確認" }));
    expect(screen.getByLabelText("プレビュー")).toHaveTextContent("完成形・1回");
    fireEvent.click(screen.getByRole("button", { name: "折り方を確認" }));
    expect(screen.getByLabelText("プレビュー")).toHaveTextContent("折り方・1回");
    fireEvent.click(screen.getByRole("button", { name: "折る画面に戻る" }));
    expect(screen.getByRole("status")).toHaveTextContent("1回の折りを記録");
  });
  it("折り操作のフェーズに合わせて次にすることを案内する", async () => {
    render(<PostEditor />);
    expect(await screen.findByText("頂点をドラッグして、重ねたい位置で離すと折れます")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "折り方を選ぶ" }));
    expect(screen.getByText("折り方を選んで「折る」を押します")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("操作中");
  });
  it("引き出しで選んだ紙の色を折る画面に反映し、空にしても直前の色を保つ", async () => {
    render(<PostEditor />);
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
    localStorage.setItem(DRAFT_KEY, serializeDraft({ model: { id: "draft", name: "私の鶴", description: "", color: "#44aabb", procedure }, viewFront: true }));
    render(<PostEditor />);
    await screen.findByRole("button", { name: "頂点を折る" });
    expect(screen.getByRole("status")).toHaveTextContent("前回の続きから再開");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("私の鶴");
    openPanel();
    expect(screen.getByRole("textbox", { name: "作品名" })).toHaveValue("私の鶴");
  });
  it("読み込めない保存済み下書きを白紙で上書きしない", async () => {
    localStorage.setItem(DRAFT_KEY, "invalid");
    render(<PostEditor />);
    expect(await screen.findByRole("alert")).toHaveTextContent("自動保存を止めています");
    expect(localStorage.getItem(DRAFT_KEY)).toBe("invalid");
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "白紙に戻す" }));
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).not.toBe("invalid"));
  });
});

describe("投稿", () => {
  let auth: AuthState = unavailableAuth;
  const wrapper = ({ children }: { children: ReactNode }) => <AuthContext.Provider value={auth}><QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider></AuthContext.Provider>;
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    auth = unavailableAuth;
    app = createApp({ auth: { authenticate: async () => "user_a" } });
    getModelRotation.mockReturnValue([0, 0, 0, 1]);
    // 同一オリジンの fetch と同じく Origin を付けてメモリ上の API へ送る
    vi.stubGlobal("fetch", (url: string | URL | Request, init?: RequestInit) => {
      const request = new Request(new URL(url instanceof Request ? url.url : url, window.location.origin), init);
      if (request.method !== "GET") request.headers.set("Origin", window.location.origin);
      return app.request(request);
    });
  });
  const openPublish = async () => {
    render(<PostEditor />, { wrapper });
    openPanel();
    expect(screen.getByRole("button", { name: "投稿へ進む" })).toBeDisabled();
    fireEvent.click(await screen.findByRole("button", { name: "頂点を折る" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "投稿へ進む" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "投稿へ進む" }));
  };

  it("完成形の向きを決めてから投稿し、作品ページへ案内する", async () => {
    await openPublish();
    // 空欄は必須入力の検証で止まり、空白だけの名前も受け付けない
    expect(screen.getByRole("textbox", { name: /作品名/ })).toBeRequired();
    fireEvent.change(screen.getByRole("textbox", { name: /作品名/ }), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    expect(await screen.findByText("作品名を入力してください。")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /作品名/ }), { target: { value: "私の鶴" } });
    fireEvent.change(screen.getByRole("textbox", { name: "説明" }), { target: { value: "はじめて折りました" } });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("先にサムネイルの向きを決めてください。");
    fireEvent.click(screen.getByRole("button", { name: "この向きに決める" }));
    // サーバーが描くのと同じ完成形の図をプレビューする
    expect((await screen.findByRole("img", { name: "私の鶴のサムネイル" })).querySelector("polygon")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    expect(await screen.findByRole("heading", { name: "投稿しました" })).toBeInTheDocument();
    const href = screen.getByRole("link", { name: "作品ページを見る" }).getAttribute("href") ?? "";
    const id = href.replace("/view/", "");
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ name: "私の鶴", description: "はじめて折りました", procedure: { history: [{ kind: "fold" }] } });
    // 説明も下書きに残る
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null")).toMatchObject({ name: "私の鶴", description: "はじめて折りました" });
    fireEvent.click(screen.getByRole("button", { name: "白紙から新しく折る" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0回の折りを記録"));
  });

  it("未ログインなら投稿せず、ログインして作成画面へ戻る", async () => {
    const signIn = vi.fn();
    auth = { status: "signedOut", signIn, signOut: vi.fn() };
    await openPublish();
    expect(screen.queryByRole("button", { name: "投稿する" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ログインして投稿" }));
    expect(signIn).toHaveBeenCalledWith("/post");
  });

  it("ログイン中にセッションが切れていたら、もう一度ログインするよう伝える", async () => {
    auth = { status: "signedIn", signIn: vi.fn(), signOut: vi.fn() };
    app = createApp();
    await openPublish();
    fireEvent.change(screen.getByRole("textbox", { name: /作品名/ }), { target: { value: "私の鶴" } });
    fireEvent.click(screen.getByRole("button", { name: "この向きに決める" }));
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("もう一度ログインしてから投稿してください");
  });

  it("ログインの設定がない環境で投稿できなければ、下書きが残ることを伝える", async () => {
    app = createApp();
    await openPublish();
    fireEvent.change(screen.getByRole("textbox", { name: /作品名/ }), { target: { value: "私の鶴" } });
    fireEvent.click(screen.getByRole("button", { name: "この向きに決める" }));
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("この環境では投稿できません。折った手順はこのブラウザに保存されています。");
    fireEvent.click(screen.getByRole("button", { name: "折る画面に戻る" }));
    expect(screen.getByRole("status")).toHaveTextContent("1回の折りを記録");
  });

  it("決めた向きを完成形を見せる向きとして保存し、下書きにも残す", async () => {
    const rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
    getModelRotation.mockReturnValue(rotation);
    await openPublish();
    fireEvent.change(screen.getByRole("textbox", { name: /作品名/ }), { target: { value: "立てた鶴" } });
    fireEvent.click(screen.getByRole("button", { name: "この向きに決める" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null")).toMatchObject({ presentation: { rotation } }));
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    const href = (await screen.findByRole("link", { name: "作品ページを見る" })).getAttribute("href") ?? "";
    expect(await (await app.request(`/api/models/${href.replace("/view/", "")}`)).json()).toMatchObject({ presentation: { rotation } });
    getModelRotation.mockReset();
  });

  it("回していなければ見せる向きを保存しない", async () => {
    await openPublish();
    fireEvent.click(screen.getByRole("button", { name: "この向きに決める" }));
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null")).not.toHaveProperty("presentation");
  });

  it("傾いた作品を画面内で15°ずつ回せる", async () => {
    await openPublish();
    fireEvent.click(screen.getByRole("button", { name: "左に回す" }));
    expect(rotateModel).toHaveBeenLastCalledWith(Math.PI / 12);
    fireEvent.click(screen.getByRole("button", { name: "右に回す" }));
    expect(rotateModel).toHaveBeenLastCalledWith(-Math.PI / 12);
  });

  it("限定公開を選んで投稿すると、一覧に載らない作品として保存される", async () => {
    await openPublish();
    expect(screen.getByText("作品一覧と検索に載り、誰でも見られます。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "限定公開" }));
    expect(screen.getByText(/URLを知っている人だけ/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /作品名/ }), { target: { value: "ひみつの鶴" } });
    fireEvent.click(screen.getByRole("button", { name: "この向きに決める" }));
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    const href = (await screen.findByRole("link", { name: "作品ページを見る" })).getAttribute("href") ?? "";
    expect(await (await app.request(`/api/models/${href.replace("/view/", "")}`)).json()).toMatchObject({ visibility: "unlisted" });
    const list = (await (await app.request("/api/models?q=ひみつ")).json()) as { total: number };
    expect(list.total).toBe(0);
  });

  it("3D表示から向きを読み取れなければ再試行を案内する", async () => {
    getModelRotation.mockReturnValue(null);
    await openPublish();
    fireEvent.click(screen.getByRole("button", { name: "この向きに決める" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("向きを読み取れませんでした");
  });
});

describe("fitZoom", () => {
  it("完成形の外接球が枠の約75%になる倍率にし、1〜4倍に収める", async () => {
    const { fitZoom } = await import("./PublishScreen");
    const square = (half: number) => [{ layer: 0, polygon: [[-half, -half, 0], [half, -half, 0], [half, half, 0], [-half, half, 0]] as [number, number, number][] }];
    const visible = 2 * 2.2 * 100 * Math.tan(Math.PI * 35 / 360);
    expect(fitZoom(100, square(25))).toBeCloseTo(visible * 0.75 / (2 * 25 * Math.SQRT2));
    expect(fitZoom(100, square(50))).toBe(1);
    expect(fitZoom(100, square(1))).toBe(4);
    expect(fitZoom(100, [])).toBe(1);
  });
});

import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppType } from "@oricube/api";
import { AuthContext, type AuthState, unavailableAuth } from "../../auth/AuthContext";
import { createQueryClient } from "../../queryClient";
import { MyOrigamiList } from "./MyOrigamiList";

const api = vi.hoisted(() => ({ app: undefined as undefined | { request: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response> } }));
// 画面からAPIまでを通して確かめるため、RPCクライアントの通信先をHonoアプリに直接つなぐ
vi.mock("../../apiClient", async (original) => {
  const { hc } = await import("hono/client");
  return {
    ...await original<typeof import("../../apiClient")>(),
    apiClient: hc<AppType>("http://localhost", { fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      if (request.method !== "GET") request.headers.set("Origin", "http://localhost");
      return api.app!.request(request);
    } }),
  };
});

const signedIn: AuthState = { status: "signedIn", signIn: vi.fn(), signOut: vi.fn() };

/** user_a の公開・限定公開・公開前の作品と、user_b の作品を入れたアプリ */
const seed = async () => {
  const [{ createApp }, { createMemoryOrigamiRepository }, { models }] = await Promise.all([import("@oricube/api"), import("@oricube/api/repository"), import("@oricube/api/mocks/models")]);
  const crane = models[0];
  const repository = createMemoryOrigamiRepository([
    { ownerId: "user_a", model: { ...crane, id: "mine-public", name: "公開の鶴" } },
    { ownerId: "user_a", model: { ...crane, id: "mine-unlisted", name: "限定の鶴", visibility: "unlisted" } },
    { ownerId: "user_a", status: "pending", model: { ...crane, id: "mine-pending", name: "途中の鶴" } },
    { ownerId: "user_b", model: { ...crane, id: "theirs", name: "他人の鶴" } },
  ]);
  api.app = createApp({ repository, auth: { authenticate: async () => "user_a" } });
  return repository;
};

const renderList = (auth: AuthState = signedIn) => render(
  <AuthContext.Provider value={auth}>
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={["/me"]}><MyOrigamiList /></MemoryRouter>
    </QueryClientProvider>
  </AuthContext.Provider>
);
const card = (name: string) => screen.getByRole("article", { name });

beforeEach(() => { api.app = undefined; });

describe("自分の作品", () => {
  it("自分の作品だけを、公開範囲・公開前の状態と一緒に並べる", async () => {
    await seed();
    renderList();
    expect(await screen.findByText("3件の作品")).toHaveAttribute("role", "status");
    const names = within(screen.getByRole("list", { name: "自分の作品" })).getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(names).toEqual(["公開の鶴", "限定の鶴", "途中の鶴"]);
    expect(within(card("公開の鶴")).getByText("公開")).toBeInTheDocument();
    expect(within(card("公開の鶴")).getByRole("link", { name: "見る" })).toHaveAttribute("href", "/view/mine-public");
    expect(within(card("公開の鶴")).getByRole("link", { name: "編集する" })).toHaveAttribute("href", "/post?edit=mine-public");
    expect(within(card("限定の鶴")).getByText(/限定公開/)).toBeInTheDocument();
    // 公開前の作品は見る・編集はできず、削除だけできる
    expect(within(card("途中の鶴")).getByText("投稿が完了していません")).toBeInTheDocument();
    expect(within(card("途中の鶴")).queryByRole("link")).not.toBeInTheDocument();
    expect(within(card("途中の鶴")).getByRole("button", { name: "削除する" })).toBeInTheDocument();
  });

  it("確認してから削除し、やめれば残す", async () => {
    const repository = await seed();
    renderList();
    await screen.findByRole("list", { name: "自分の作品" });
    fireEvent.click(within(card("公開の鶴")).getByRole("button", { name: "削除する" }));
    const dialog = await screen.findByRole("alertdialog", { name: "「公開の鶴」を削除しますか？" });
    expect(dialog).toHaveTextContent("元に戻せません");
    fireEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(await repository.findById("mine-public")).not.toBeNull();

    fireEvent.click(within(card("公開の鶴")).getByRole("button", { name: "削除する" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "削除する" }));
    expect(await screen.findByText(/「公開の鶴」を削除しました。2件の作品/)).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "公開の鶴" })).not.toBeInTheDocument();
    expect(await repository.findById("mine-public")).toBeNull();
    expect(await repository.findById("theirs")).not.toBeNull();
  });

  it("削除に失敗したら、ダイアログの中で理由を伝える", async () => {
    await seed();
    renderList();
    await screen.findByRole("list", { name: "自分の作品" });
    // セッションが切れた状態にする
    const [{ createApp }] = await Promise.all([import("@oricube/api")]);
    api.app = createApp({ auth: { authenticate: async () => null } });
    fireEvent.click(within(card("限定の鶴")).getByRole("button", { name: "削除する" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "削除する" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("もう一度ログイン");
  });

  it("未ログインならログインを促し、ログイン後はこの画面へ戻る", async () => {
    const signIn = vi.fn();
    renderList({ status: "signedOut", signIn, signOut: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));
    expect(signIn).toHaveBeenCalledWith("/me");
  });

  it("ログインが設定されていない環境では API に任せ、拒否されたら表示できないことを伝える", async () => {
    await seed();
    renderList(unavailableAuth);
    // 開発用の API（開発ユーザーでログイン扱い）なら表示できる
    expect(await screen.findByText("3件の作品")).toBeInTheDocument();
  });

  it("ログインが設定されておらず API にも拒否されたら、表示できないことを伝える", async () => {
    const { createApp } = await import("@oricube/api");
    api.app = createApp();
    renderList(unavailableAuth);
    expect(await screen.findByText(/この環境では自分の作品を表示できません/)).toBeInTheDocument();
  });

  it("セッションが切れていたら、ログインを促す", async () => {
    const { createApp } = await import("@oricube/api");
    api.app = createApp();
    renderList();
    expect(await screen.findByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });
});

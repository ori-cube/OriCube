import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppType } from "@oricube/api";
import { createQueryClient } from "../../queryClient";
import { OrigamiList } from "./OrigamiList";

const api = vi.hoisted(() => ({ app: undefined as undefined | { request: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response> } }));
// 画面からAPIまでを通して確かめるため、RPCクライアントの通信先をHonoアプリに直接つなぐ
vi.mock("../../apiClient", async (original) => {
  const [{ createApp }, { hc }] = await Promise.all([import("@oricube/api"), import("hono/client")]);
  return {
    ...await original<typeof import("../../apiClient")>(),
    apiClient: hc<AppType>("http://localhost", { fetch: (input: RequestInfo | URL, init?: RequestInit) => (api.app ?? createApp()).request(input, init) }),
  };
});

beforeEach(() => { window.scrollTo = vi.fn(); });
afterEach(() => { api.app = undefined; });

const renderAt = (path: string) => {
  const router = createMemoryRouter([{ path: "/", element: <OrigamiList /> }], { initialEntries: [path] });
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
};

const names = () => within(screen.getByRole("list", { name: "作品" })).getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

describe("作品の一覧", () => {
  it("作品ごとに完成形の図・名前・ステップ数を表示し、閲覧ページへリンクする", async () => {
    renderAt("/");
    const crane = await screen.findByRole("link", { name: /鶴/ });
    expect(crane).toHaveAttribute("href", "/view/crane");
    // 鶴は完成形の向きに整えるステップを含む
    expect(within(crane).getByText("22ステップ")).toBeInTheDocument();
    const fills = [...crane.querySelectorAll("svg polygon")].map((polygon) => polygon.getAttribute("fill"));
    expect(fills).toEqual(expect.arrayContaining(["#ed7070", "#ffffff"]));
    expect(within(screen.getByRole("link", { name: /折る前の紙/ })).getByText("折り手順なし")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2件の作品");
    expect(screen.queryByRole("navigation", { name: "一覧のページ" })).not.toBeInTheDocument();
  });

  it("入力が止まったら検索し、検索語をURLに入れる", async () => {
    const router = renderAt("/");
    await screen.findByRole("link", { name: /鶴/ });
    fireEvent.change(screen.getByRole("searchbox", { name: "作品を検索" }), { target: { value: "鶴" } });
    await waitFor(() => expect(router.state.location.search).toBe(`?q=${encodeURIComponent("鶴")}`));
    await waitFor(() => expect(names()).toEqual(["鶴"]));
    expect(screen.getByRole("status")).toHaveTextContent("「鶴」の検索結果 1件");
  });

  it("URLの検索語で開き、一致しなければ案内を表示し、クリアで全件に戻る", async () => {
    const router = renderAt("/?q=かえる");
    expect(await screen.findByText("条件に一致する作品はありません。別の言葉で検索してください。")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "作品を検索" })).toHaveValue("かえる");
    fireEvent.click(screen.getByRole("button", { name: "検索をクリア" }));
    await waitFor(() => expect(router.state.location.search).toBe(""));
    expect(await screen.findByRole("link", { name: /鶴/ })).toBeInTheDocument();
  });

  it("件数が多いとページを切り替えられる", async () => {
    const [{ createApp, MODELS_PAGE_SIZE }, { createMemoryOrigamiRepository }] = await Promise.all([import("@oricube/api"), import("@oricube/api/repository")]);
    api.app = createApp({ repository: createMemoryOrigamiRepository(Array.from({ length: MODELS_PAGE_SIZE + 1 }, (_, index) => ({
      ownerId: null,
      model: { id: `m${index}`, name: `作品${index}`, description: "", color: "#ffffff", procedure: { version: 2, size: 100, steps: [], history: [], finalBoards: [] } },
    }))) });
    const router = renderAt("/");
    expect(await screen.findByRole("link", { name: /作品0/ })).toBeInTheDocument();
    const pagination = screen.getByRole("navigation", { name: "一覧のページ" });
    fireEvent.click(within(pagination).getByRole("button", { name: "2ページ目" }));
    await waitFor(() => expect(names()).toEqual([`作品${MODELS_PAGE_SIZE}`]));
    expect(router.state.location.search).toBe("?page=2");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("読み込みに失敗したら再試行できる", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    let fail = true;
    const { createApp } = await import("@oricube/api");
    api.app = { request: (input, init) => fail ? new Response(null, { status: 500 }) : createApp().request(input, init) };
    renderAt("/");
    expect(await screen.findByRole("alert")).toHaveTextContent("作品を読み込めませんでした");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(await screen.findByRole("link", { name: /鶴/ })).toBeInTheDocument();
    error.mockRestore();
  });
});

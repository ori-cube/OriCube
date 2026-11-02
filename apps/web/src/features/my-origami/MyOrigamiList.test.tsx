import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppType } from "@oricube/api";
import { createQueryClient } from "../../queryClient";
import { EDIT_KEYS_KEY } from "../post-editor/editKeys";
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

const sha256 = async (value: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/** 公開・限定公開の自分の作品と、他人の作品を入れたアプリ。このブラウザには自分の作品の鍵を古い順に残す */
const seed = async () => {
  const [{ createApp }, { createMemoryOrigamiRepository }, { models }] = await Promise.all([import("@oricube/api"), import("@oricube/api/repository"), import("@oricube/api/mocks/models")]);
  const crane = models[0];
  const repository = createMemoryOrigamiRepository([
    { editKeyHash: await sha256("key-public"), model: { ...crane, id: "mine-public", name: "公開の鶴" } },
    { editKeyHash: await sha256("key-unlisted"), model: { ...crane, id: "mine-unlisted", name: "限定の鶴", visibility: "unlisted" } },
    { editKeyHash: await sha256("key-theirs"), model: { ...crane, id: "theirs", name: "他人の鶴" } },
  ]);
  api.app = createApp({ repository });
  // 他のブラウザで削除した作品の鍵も残っている
  localStorage.setItem(EDIT_KEYS_KEY, JSON.stringify({ "mine-unlisted": "key-unlisted", gone: "key-gone", "mine-public": "key-public" }));
  return repository;
};

const renderList = () => render(
  <QueryClientProvider client={createQueryClient()}>
    <MemoryRouter initialEntries={["/me"]}><MyOrigamiList /></MemoryRouter>
  </QueryClientProvider>
);
const card = (name: string) => screen.getByRole("article", { name });

beforeEach(() => { api.app = undefined; localStorage.clear(); });

describe("自分の作品", () => {
  it("このブラウザに鍵がある作品だけを、新しく投稿した順に公開範囲と一緒に並べる", async () => {
    await seed();
    renderList();
    expect(await screen.findByText("2件の作品")).toHaveAttribute("role", "status");
    const names = within(screen.getByRole("list", { name: "自分の作品" })).getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(names).toEqual(["公開の鶴", "限定の鶴"]);
    expect(within(card("公開の鶴")).getByText("公開")).toBeInTheDocument();
    expect(within(card("公開の鶴")).getByRole("link", { name: "見る" })).toHaveAttribute("href", "/view/mine-public");
    expect(within(card("公開の鶴")).getByRole("link", { name: "編集する" })).toHaveAttribute("href", "/post?edit=mine-public");
    expect(within(card("限定の鶴")).getByText(/限定公開/)).toBeInTheDocument();
  });

  it("確認してから削除し、やめれば残す。削除したら鍵も消す", async () => {
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
    expect(await screen.findByText(/「公開の鶴」を削除しました。1件の作品/)).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "公開の鶴" })).not.toBeInTheDocument();
    expect(await repository.findById("mine-public")).toBeNull();
    expect(await repository.findById("theirs")).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(EDIT_KEYS_KEY) ?? "{}")).not.toHaveProperty("mine-public");
  });

  it("鍵が合わず削除できなければ、ダイアログの中で理由を伝える", async () => {
    await seed();
    renderList();
    await screen.findByRole("list", { name: "自分の作品" });
    localStorage.setItem(EDIT_KEYS_KEY, JSON.stringify({ "mine-unlisted": "wrong-key", "mine-public": "key-public" }));
    fireEvent.click(within(card("限定の鶴")).getByRole("button", { name: "削除する" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "削除する" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("編集用の鍵では削除できませんでした");
  });

  it("このブラウザで投稿した作品が無ければ、そう伝える", async () => {
    const { createApp } = await import("@oricube/api");
    api.app = createApp();
    renderList();
    expect(await screen.findByText("このブラウザで投稿した作品はまだありません。")).toBeInTheDocument();
  });
});

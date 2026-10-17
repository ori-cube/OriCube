import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { AppType } from "@oricube/api";
import { craneProcedure } from "@oricube/api/mocks/crane";
import { AuthContext, type AuthState, unavailableAuth } from "../../auth/AuthContext";
import { createQueryClient } from "../../queryClient";
import { PublishButton } from "./PublishButton";

const api = vi.hoisted(() => ({ user: "user_a" as string | null }));
// 画面からAPIまでを通して確かめるため、RPCクライアントの通信先をHonoアプリに直接つなぐ
vi.mock("../../apiClient", async (original) => {
  const [{ createApp }, { hc }] = await Promise.all([import("@oricube/api"), import("hono/client")]);
  const app = createApp({ auth: { authenticate: async () => api.user } });
  return { ...await original<typeof import("../../apiClient")>(), apiClient: hc<AppType>("http://localhost", { fetch: (input: RequestInfo | URL, init?: RequestInit) => app.request(input, init) }) };
});

const model = { id: "crane", name: "投稿する鶴", description: "説明", color: "#ed7070", procedure: craneProcedure };

function Viewed() {
  return <p>表示: {useParams().id}</p>;
}

const renderButton = (auth: AuthState) => render(
  <AuthContext.Provider value={auth}>
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={["/post"]}>
        <Routes>
          <Route path="/post" element={<PublishButton model={model} />} />
          <Route path="/view/:id" element={<Viewed />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  </AuthContext.Provider>
);

describe("PublishButton", () => {
  it("ログイン済みなら投稿し、IDの閲覧ページへ移動する", async () => {
    api.user = "user_a";
    renderButton({ status: "signedIn", signIn: vi.fn(), signOut: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    expect(await screen.findByText(/^表示: [0-9a-f-]{36}$/)).toBeInTheDocument();
  });

  it("未ログインならログイン画面へ移動し、戻り先は作成画面にする（投稿はしない）", () => {
    const signIn = vi.fn();
    renderButton({ status: "signedOut", signIn, signOut: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: "ログインして投稿" }));
    expect(signIn).toHaveBeenCalledWith("/post");
    expect(screen.queryByText(/^表示:/)).not.toBeInTheDocument();
  });

  it("セッションが切れていればログインを促す", async () => {
    api.user = null;
    renderButton({ status: "signedIn", signIn: vi.fn(), signOut: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: "投稿する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("もう一度ログイン");
  });

  it("ログインが設定されていない環境では投稿ボタンを出さない", () => {
    renderButton(unavailableAuth);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/この環境では投稿できません/)).toBeInTheDocument();
  });
});

import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { AppType } from "@oricube/api";
import type { OrigamiViewerProps } from "@/components/v2/OrigamiViewer";
import { createQueryClient } from "./queryClient";
import { routes } from "./routes";

vi.mock("@/components/v2/OrigamiViewer", () => ({
  OrigamiViewer: function Viewer({ model, startAtEnd }: OrigamiViewerProps) {
    return <main aria-label="閲覧">{model.name}・{startAtEnd ? "最終ステップ" : "最初のステップ"}</main>;
  },
}));
vi.mock("@/features/origami-viewer-v2/MockWorkshop", () => ({ MockWorkshop: () => <main aria-label="作成" /> }));
// 画面からAPIまでを通して確かめるため、RPCクライアントの通信先をHonoアプリに直接つなぐ
vi.mock("./apiClient", async (original) => {
  const [{ app }, { hc }] = await Promise.all([import("@oricube/api"), import("hono/client")]);
  return { ...await original<typeof import("./apiClient")>(), apiClient: hc<AppType>("http://localhost", { fetch: (input: RequestInfo | URL, init?: RequestInit) => app.request(input, init) }) };
});

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<QueryClientProvider client={createQueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
};

describe("v2のルーティング", () => {
  it("トップと/viewは鶴の閲覧ページへ移動する", async () => {
    for (const path of ["/", "/view"]) {
      const router = renderAt(path);
      expect(await screen.findByLabelText("閲覧")).toHaveTextContent("鶴・最初のステップ");
      expect(router.state.location.pathname).toBe("/view/crane");
      router.dispose();
      document.body.innerHTML = "";
    }
  });

  it("?step=lastで最終ステップから表示する", async () => {
    renderAt("/view/crane?step=last");
    expect(await screen.findByLabelText("閲覧")).toHaveTextContent("最終ステップ");
  });

  it("存在しない作品と未定義のURLは見つからない表示にする", async () => {
    renderAt("/view/unknown");
    expect(await screen.findByRole("heading", { name: "折り紙が見つかりませんでした" })).toBeInTheDocument();
    document.body.innerHTML = "";
    renderAt("/v2/view/crane");
    expect(await screen.findByRole("heading", { name: "折り紙が見つかりませんでした" })).toBeInTheDocument();
  });

  it("/postで作成画面を表示する", async () => {
    renderAt("/post");
    expect(await screen.findByLabelText("作成")).toBeInTheDocument();
  });
});

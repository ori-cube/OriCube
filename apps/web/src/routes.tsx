import { Navigate, type RouteObject } from "react-router";
import { DEFAULT_ORIGAMI_V2_ID } from "@/features/origami-viewer-v2/repository";
import { AppLayout } from "./layouts/AppLayout";
import { ErrorPage } from "./pages/ErrorPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      // 作品一覧ができるまでは鶴の閲覧ページへ案内する
      { index: true, element: <Navigate to={`/view/${DEFAULT_ORIGAMI_V2_ID}`} replace /> },
      { path: "view", element: <Navigate to={`/view/${DEFAULT_ORIGAMI_V2_ID}`} replace /> },
      // 閲覧ページに編集画面とソルバを含めないよう、ページ単位で分割して読み込む
      { path: "view/:id", lazy: async () => ({ Component: (await import("./pages/ViewPage")).ViewPage }) },
      { path: "post", lazy: async () => ({ Component: (await import("./pages/PostPage")).PostPage }) },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

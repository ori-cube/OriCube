import { Navigate, type RouteObject } from "react-router";
import { AppLayout } from "./layouts/AppLayout";
import { ErrorPage } from "./pages/ErrorPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      // 閲覧ページに編集画面とソルバを含めないよう、ページ単位で分割して読み込む
      { index: true, lazy: async () => ({ Component: (await import("./pages/HomePage")).HomePage }) },
      { path: "view", element: <Navigate to="/" replace /> },
      { path: "view/:id", lazy: async () => ({ Component: (await import("./pages/ViewPage")).ViewPage }) },
      { path: "post", lazy: async () => ({ Component: (await import("./pages/PostPage")).PostPage }) },
      { path: "me", lazy: async () => ({ Component: (await import("./pages/MyOrigamiPage")).MyOrigamiPage }) },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router";
import "destyle.css";
import "@oricube/design-system/tokens.css";
import "./global.css";
import { AuthProvider } from "./auth/AuthProvider";
import { createQueryClient } from "./queryClient";
import { routes } from "./routes";

const root = document.getElementById("root");
if (!root) throw new Error("#root がありません");

const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>
);

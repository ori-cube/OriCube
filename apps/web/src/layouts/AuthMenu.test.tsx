import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState, unavailableAuth } from "../auth/AuthContext";
import { AuthMenu } from "./AuthMenu";

const renderMenu = (auth: AuthState) => render(
  <AuthContext.Provider value={auth}>
    <MemoryRouter initialEntries={["/view/crane?step=last"]}><AuthMenu /></MemoryRouter>
  </AuthContext.Provider>
);

describe("AuthMenu", () => {
  it("未ログインならログインし、今の画面へ戻る", () => {
    const signIn = vi.fn();
    renderMenu({ status: "signedOut", signIn, signOut: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));
    expect(signIn).toHaveBeenCalledWith("/view/crane?step=last");
  });

  it("ログイン中なら自分の作品へ移動でき、ログアウトできる", () => {
    const signOut = vi.fn();
    renderMenu({ status: "signedIn", signIn: vi.fn(), signOut });
    expect(screen.getByRole("link", { name: "自分の作品" })).toHaveAttribute("href", "/me");
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(signOut).toHaveBeenCalled();
  });

  it("ログインが設定されていない・読み込み中なら何も出さない", () => {
    renderMenu(unavailableAuth);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

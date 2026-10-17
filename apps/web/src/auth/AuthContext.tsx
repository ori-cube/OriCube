import { createContext, useContext } from "react";

export type AuthStatus = "loading" | "signedIn" | "signedOut" | "unavailable";

/** 画面が使うログイン状態。認証サービス（Clerk）への依存はここで閉じる */
export interface AuthState {
  status: AuthStatus;
  /** ログイン画面へ移動し、ログイン後は returnTo へ戻る */
  signIn: (returnTo: string) => void;
  signOut: () => void;
}

/** 認証サービスが設定されていない環境（ローカル・テスト）の状態 */
export const unavailableAuth: AuthState = { status: "unavailable", signIn: () => {}, signOut: () => {} };

export const AuthContext = createContext<AuthState>(unavailableAuth);

export const useAuthState = () => useContext(AuthContext);

import type { AuthStatus } from "../../auth/AuthContext";
import { ApiRequestError } from "../../apiClient";

/**
 * 失敗の理由ごとに、次にすることを案内する
 *
 * @param authStatus - 画面のログイン状態。401 のとき、ログイン切れか、ログインできない環境かを分ける
 */
export const submitErrorMessage = (error: unknown, authStatus: AuthStatus = "signedIn") => {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return authStatus === "unavailable"
        ? "ログインの設定がないため、この環境では投稿できません。折った手順はこのブラウザに保存されています。"
        : "ログインの有効期限が切れました。もう一度ログインしてから投稿してください。折った手順はこのブラウザに保存されています。";
    }
    if (error.status === 413) return "作品のデータが大きすぎて投稿できません。";
    if (error.status === 400) return `投稿できませんでした。${error.message}`;
  }
  return "投稿できませんでした。通信状況を確認して、もう一度「投稿する」を押してください。";
};

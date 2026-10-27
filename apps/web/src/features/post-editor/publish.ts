import { ApiRequestError } from "../../apiClient";

/** 失敗の理由ごとに、次にすることを案内する。どの場合も折った手順はブラウザに残っている */
export const submitErrorMessage = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    if (error.code === "verification_failed") return "ロボットでないことを確認できませんでした。もう一度確認してから「投稿する」を押してください。折った手順はこのブラウザに保存されています。";
    if (error.status === 429) return "短い時間に投稿が続いています。1分ほど待ってから、もう一度「投稿する」を押してください。";
    if (error.status === 413) return "作品のデータが大きすぎて投稿できません。";
    if (error.status === 400) return `投稿できませんでした。${error.message}`;
  }
  return "投稿できませんでした。通信状況を確認して、もう一度「投稿する」を押してください。";
};

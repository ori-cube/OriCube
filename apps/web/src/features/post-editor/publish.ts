import { ApiRequestError, updateOrigami, type ApiClient, type OrigamiInput } from "../../apiClient";
import { loadEditKey } from "./editKeys";

/**
 * 公開中の作品を同じIDのまま上書きする（再編集）
 *
 * @description
 * ログインの代わりに、投稿したときにこのブラウザへ残した編集用の鍵を送る。鍵が無ければ送らずに失敗にする。
 * サムネイルはサーバーが手順から描くため、内容を上書きするだけでよい（同じ内容で何度再試行しても作品は増えない）
 */
export const submitUpdate = async ({ client, id, input }: { client: ApiClient; id: string; input: OrigamiInput }) => {
  const editKey = loadEditKey(id);
  if (!editKey) throw new ApiRequestError("編集用の鍵がありません。", 403, "missing_edit_key");
  await updateOrigami(client, id, input, editKey);
  return id;
};

/** 失敗の理由ごとに、次にすることを案内する。どの場合も折った手順はブラウザに残っている */
export const submitErrorMessage = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    if (error.code === "verification_failed") return "ロボットでないことを確認できませんでした。もう一度確認してから「投稿する」を押してください。折った手順はこのブラウザに保存されています。";
    if (error.code === "missing_edit_key") return "このブラウザには、この作品の編集用の鍵がありません。投稿したブラウザで更新するか、作品の設定で編集をやめて新しい作品として投稿してください。";
    if (error.status === 403 && error.code === "forbidden") return "この作品を変更する権限がありません。編集用の鍵が正しくない可能性があります。";
    if (error.status === 404 && error.code === "not_found") return "更新する作品が見つかりません。削除された可能性があります。新しい作品として投稿するには、作品の設定で編集をやめてください。";
    if (error.status === 429) return "短い時間に投稿が続いています。1分ほど待ってから、もう一度「投稿する」を押してください。";
    if (error.status === 413) return "作品のデータが大きすぎて投稿できません。";
    if (error.status === 400) return `投稿できませんでした。${error.message}`;
  }
  return "投稿できませんでした。通信状況を確認して、もう一度「投稿する」を押してください。";
};

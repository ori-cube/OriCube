import type { AuthStatus } from "../../auth/AuthContext";
import { ApiRequestError, createOrigami, publishOrigami, renewThumbnailUpload, replaceThumbnail, updateOrigami, uploadThumbnail, type ApiClient, type OrigamiInput, type PendingOrigami } from "../../apiClient";

/** 出力するサムネイルの一辺。一覧のカードと OGP（summary カード）で使う正方形 */
export const THUMBNAIL_SIZE = 640;

/** 途中で失敗した投稿。同じ内容で再試行するときは、作り直さずに続きから進める */
export interface PendingSubmission extends PendingOrigami {
  /** 作品の内容の JSON。変わっていたら別の作品として作り直す */
  inputKey: string;
  thumbnail: Blob;
}

interface SubmitOptions {
  client: ApiClient;
  input: OrigamiInput;
  thumbnail: Blob;
  /** 前回失敗した投稿 */
  previous: PendingSubmission | null;
  /** 公開前の作品を作った・作り直したときに呼ぶ。失敗しても次の再試行で使えるよう保持する */
  onPending: (pending: PendingSubmission) => void;
  now?: () => number;
}

const expired = (pending: PendingOrigami, now: number) => Date.parse(pending.thumbnailUpload.expiresAt) <= now;

/**
 * 作品を投稿し、サムネイルをアップロードしてから公開する
 *
 * @description
 * #100 の画像保存の流れ（pending で作成 → 保存先へ直接アップロード → 確定APIで公開）。
 * 途中で失敗したら、同じ内容の再試行では作品を作り直さず、重複した作品を残さない。
 * 撮り直し・期限切れのときはアップロード先だけを作り直す
 */
export const submitOrigami = async ({ client, input, thumbnail, previous, onPending, now = Date.now }: SubmitOptions) => {
  const inputKey = JSON.stringify(input);
  let pending = previous?.inputKey === inputKey ? previous : null;
  if (!pending) {
    pending = { ...(await createOrigami(client, input, thumbnail)), inputKey, thumbnail };
    onPending(pending);
  } else if (pending.thumbnail !== thumbnail || expired(pending, now())) {
    pending = { ...(await renewThumbnailUpload(client, pending.id, thumbnail)), inputKey, thumbnail };
    onPending(pending);
  }
  try {
    await uploadThumbnail(pending.thumbnailUpload, thumbnail);
  } catch (error) {
    // 期限切れなどで保存先に拒否されたら、アップロード先を作り直して1回だけ送り直す
    if (!(error instanceof ApiRequestError) || error.status !== 403) throw error;
    pending = { ...(await renewThumbnailUpload(client, pending.id, thumbnail)), inputKey, thumbnail };
    onPending(pending);
    await uploadThumbnail(pending.thumbnailUpload, thumbnail);
  }
  await publishOrigami(client, pending.id);
  return pending.id;
};

interface UpdateOptions {
  client: ApiClient;
  /** 上書きする作品のID */
  id: string;
  input: OrigamiInput;
  /** 撮り直したサムネイル。null なら今のサムネイルのまま */
  thumbnail: Blob | null;
}

/**
 * 公開済みの作品を同じIDのまま上書きする（再編集）
 *
 * @description
 * 内容を上書きしてから、撮り直したサムネイルがあれば新しいキーへ置いて差し替える。
 * どの段階で失敗しても同じ内容で再試行でき、作品は増えない（差し替えるまでは前のサムネイルのまま）
 */
export const submitUpdate = async ({ client, id, input, thumbnail }: UpdateOptions) => {
  await updateOrigami(client, id, input);
  if (!thumbnail) return id;
  let target = await renewThumbnailUpload(client, id, thumbnail);
  try {
    await uploadThumbnail(target.thumbnailUpload, thumbnail);
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 403) throw error;
    target = await renewThumbnailUpload(client, id, thumbnail);
    await uploadThumbnail(target.thumbnailUpload, thumbnail);
  }
  await replaceThumbnail(client, id, target.thumbnailKey);
  return id;
};

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
    if (error.status === 403 && error.code === "forbidden") return "この作品を変更する権限がありません。自分の作品か、ログインしているアカウントを確認してください。";
    if (error.status === 404 && error.code === "not_found") return "更新する作品が見つかりません。削除された可能性があります。新しい作品として投稿するには、作品の設定で編集をやめてください。";
    if (error.status === 413) return "作品のデータが大きすぎて投稿できません。";
    if (error.status === 400) return `投稿できませんでした。${error.message}`;
  }
  return "投稿できませんでした。通信状況を確認して、もう一度「投稿する」を押してください。";
};

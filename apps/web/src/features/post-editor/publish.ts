import { ApiRequestError, createOrigami, publishOrigami, renewThumbnailUpload, uploadThumbnail, type ApiClient, type OrigamiInput, type PendingOrigami } from "../../apiClient";

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

/** 失敗の理由ごとに、次にすることを案内する */
export const submitErrorMessage = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "投稿にはログインが必要です。折った手順はこのブラウザに保存されています。";
    if (error.status === 413) return "作品のデータが大きすぎて投稿できません。";
    if (error.status === 400) return `投稿できませんでした。${error.message}`;
  }
  return "投稿できませんでした。通信状況を確認して、もう一度「投稿する」を押してください。";
};

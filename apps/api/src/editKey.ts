/** 編集用の鍵を受け取るヘッダー。Cookie ではないので、他サイトからの送信では付かない */
export const EDIT_KEY_HEADER = "X-Edit-Key";

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** 保存する値。鍵そのものは保存せず、SHA-256 の16進数にする（DB が漏れても鍵は分からない） */
export const hashEditKey = async (key: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * 作品を編集・削除するための鍵を作る
 *
 * @description
 * ログインの代わりに、投稿したブラウザだけが鍵を持つ。256bit の乱数なので推測できない。
 * 鍵は投稿の応答で1回だけ返し、サーバーにはハッシュだけを残す
 */
export const createEditKey = async () => {
  const key = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  return { key, hash: await hashEditKey(key) };
};

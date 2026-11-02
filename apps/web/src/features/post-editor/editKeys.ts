/** 投稿した作品の編集用の鍵を置く場所（作品ID → 鍵） */
export const EDIT_KEYS_KEY = "oricube:edit-keys";

const readAll = (): Record<string, string> => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(EDIT_KEYS_KEY) ?? "{}");
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, string>) : {};
  } catch {
    return {};
  }
};

/**
 * 作品の編集用の鍵をこのブラウザに残す
 *
 * @description
 * ログインの代わりに、鍵を持つブラウザだけが作品を編集・削除できる。鍵は投稿の応答でしか受け取れないため、
 * 保存できなかったら false を返して画面で伝える（プライベートブラウズ・容量超過など）
 */
export const saveEditKey = (id: string, key: string) => {
  try {
    localStorage.setItem(EDIT_KEYS_KEY, JSON.stringify({ ...readAll(), [id]: key }));
    return true;
  } catch {
    return false;
  }
};

/** このブラウザに残っている作品の編集用の鍵。無ければ null */
export const loadEditKey = (id: string) => readAll()[id] ?? null;

/** このブラウザに編集用の鍵がある作品のID。新しく保存した順 */
export const listEditKeyIds = () => Object.keys(readAll()).reverse();

/** 削除した作品の鍵を消す。消せなくても次の一覧で見つからない作品として除くので、失敗は無視する */
export const removeEditKey = (id: string) => {
  try {
    const { [id]: _removed, ...rest } = readAll();
    localStorage.setItem(EDIT_KEYS_KEY, JSON.stringify(rest));
  } catch {
    // 何もしない
  }
};

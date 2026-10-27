/**
 * 書き込みの回数制限
 *
 * @description
 * Workers では Cloudflare の Rate Limiting バインディング（wrangler.jsonc の ratelimits）がこの形を満たす。
 * Node.js とテストでは {@link createMemoryRateLimiter} を使う
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** 投稿・更新・削除など、ログインした人1人あたりの書き込み回数の上限（期間ごと） */
export const WRITE_LIMIT = 30;
export const WRITE_LIMIT_PERIOD_SECONDS = 60;

/**
 * メモリ上の固定窓の回数制限
 *
 * @description
 * キーごとに期間の始まりからの回数を数え、上限を超えたら期間が終わるまで拒否する。
 * Workers の isolate や Node.js のプロセスごとの数え方なので、本番では Rate Limiting バインディングを使う
 */
export const createMemoryRateLimiter = ({ limit = WRITE_LIMIT, periodMs = WRITE_LIMIT_PERIOD_SECONDS * 1000, now = () => Date.now() }: { limit?: number; periodMs?: number; now?: () => number } = {}): RateLimiter => {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    limit: async ({ key }) => {
      const time = now();
      // 期間の過ぎたキーを掃除して、メモリが増え続けないようにする
      for (const [other, window] of windows) if (time - window.start >= periodMs) windows.delete(other);
      const window = windows.get(key) ?? { start: time, count: 0 };
      window.count += 1;
      windows.set(key, window);
      return { success: window.count <= limit };
    },
  };
};

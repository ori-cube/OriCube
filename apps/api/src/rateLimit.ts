/** 書き込みの回数の上限。キー（接続元の IP）ごとに数え、上限を超えたら false */
export interface RateLimiter {
  limit(key: string): Promise<boolean>;
}

/** 上限なし（Node.js・テスト） */
export const unlimited: RateLimiter = { limit: async () => true };

/** Workers の Rate Limiting バインディング（wrangler.jsonc の ratelimits）のうち、使う操作だけを型にする */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Workers の Rate Limiting バインディングで数える
 *
 * @description
 * 数え方は Cloudflare の拠点ごとの近似で、厳密な上限ではない。bot は Turnstile で止め、こちらは連続投稿を抑える
 */
export const bindingRateLimiter = (binding: RateLimitBinding): RateLimiter => ({
  limit: async (key) => (await binding.limit({ key })).success,
});

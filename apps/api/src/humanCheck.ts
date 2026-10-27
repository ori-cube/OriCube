/**
 * 投稿したのが人かどうか（bot でないか）を確かめる
 *
 * @description
 * 本番は Cloudflare Turnstile（{@link createTurnstileVerifier}）。画面のウィジェットが発行したトークンを受け取り、サーバーで検証する
 */
export interface HumanVerifier {
  verify(token: string, remoteIp: string | null): Promise<boolean>;
}

/** 検証の設定が無い環境（Node.js・テスト）。常に拒否して、誰でも投稿できる状態にしない */
export const rejectingHumanVerifier: HumanVerifier = { verify: async () => false };

/** 開発用: 常に人として扱う。`src/dev.ts` とテストだけで使い、本番の入口（index.ts・worker.ts）では使わない */
export const acceptingHumanVerifier: HumanVerifier = { verify: async () => true };

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifierOptions {
  secretKey: string;
  /** 受け付けるホスト名（例: oricube.example）。他のサイトで発行したトークンを拒否する。未指定なら確かめない */
  hostname?: string;
  fetch?: typeof fetch;
}

/** Turnstile のトークンを siteverify で検証する。トークンは1回しか使えない */
export const createTurnstileVerifier = ({ secretKey, hostname, fetch: send = fetch }: TurnstileVerifierOptions): HumanVerifier => ({
  verify: async (token, remoteIp) => {
    if (!token) return false;
    const body = new FormData();
    body.append("secret", secretKey);
    body.append("response", token);
    if (remoteIp) body.append("remoteip", remoteIp);
    try {
      const res = await send(SITEVERIFY_URL, { method: "POST", body });
      if (!res.ok) return false;
      const result = (await res.json()) as { success?: boolean; hostname?: string };
      return result.success === true && (!hostname || result.hostname === hostname);
    } catch (error) {
      console.error("Turnstile のトークンを検証できませんでした", error);
      return false;
    }
  },
});

/** 環境変数から検証方法を選ぶ。秘密鍵が無ければ常に拒否する（投稿APIは403になる） */
export const humanVerifierFromEnv = (env: { TURNSTILE_SECRET_KEY?: string; APP_ORIGIN?: string }): HumanVerifier =>
  env.TURNSTILE_SECRET_KEY
    ? createTurnstileVerifier({ secretKey: env.TURNSTILE_SECRET_KEY, hostname: env.APP_ORIGIN ? new URL(env.APP_ORIGIN).hostname : undefined })
    : rejectingHumanVerifier;

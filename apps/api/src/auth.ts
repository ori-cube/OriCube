import { createClerkClient } from "@clerk/backend";

/** リクエストからログイン中のユーザーIDを取り出す。未ログイン・無効なセッションは null */
export interface AuthVerifier {
  authenticate(request: Request): Promise<string | null>;
}

/** 認証サービス未設定の環境（ローカル・CI）用。常に未ログインとして扱う */
export const anonymousVerifier: AuthVerifier = {
  authenticate: async () => null,
};

interface ClerkVerifierOptions {
  secretKey: string;
  publishableKey: string;
  /** セッションを受け付けるオリジン（例: https://oricube.example）。未指定ならClerkの既定 */
  authorizedParties?: string[];
}

/**
 * Clerk のセッション（同一オリジンの Cookie、または Authorization ヘッダー）を検証する
 *
 * @description
 * 投稿者はここで確定したユーザーIDだけを信用する。クライアントが送るユーザーIDやメールアドレスは使わない
 */
export const createClerkVerifier = ({ secretKey, publishableKey, authorizedParties }: ClerkVerifierOptions): AuthVerifier => {
  const clerk = createClerkClient({ secretKey, publishableKey });
  return {
    authenticate: async (request) => {
      const state = await clerk.authenticateRequest(request, { authorizedParties, acceptsToken: "session_token" });
      return state.isAuthenticated ? state.toAuth().userId : null;
    },
  };
};

/** 環境変数から検証方法を選ぶ。キーが無ければ未ログイン扱い（書き込みAPIは401になる） */
export const verifierFromEnv = (env: { CLERK_SECRET_KEY?: string; CLERK_PUBLISHABLE_KEY?: string; APP_ORIGIN?: string }): AuthVerifier =>
  env.CLERK_SECRET_KEY && env.CLERK_PUBLISHABLE_KEY
    ? createClerkVerifier({
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.CLERK_PUBLISHABLE_KEY,
        authorizedParties: env.APP_ORIGIN ? [env.APP_ORIGIN] : undefined,
      })
    : anonymousVerifier;

/**
 * 開発用: 常に同じユーザーでログインしている扱いにする
 *
 * @description
 * Clerk のキーが無いローカル環境で投稿を確かめるためのもの。`src/dev.ts` だけで使い、本番の入口（index.ts・worker.ts）では使わない
 */
export const createFixedUserVerifier = (userId: string): AuthVerifier => ({
  authenticate: async () => userId,
});

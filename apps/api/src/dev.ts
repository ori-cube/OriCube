import { acceptingHumanVerifier, humanVerifierFromEnv } from "./humanCheck";
import { startNodeServer } from "./node";

// 開発用の入口（pnpm dev:api）。Turnstile の秘密鍵が無ければ、人の確認を省いて投稿を確かめられるようにする
const secretKey = process.env.TURNSTILE_SECRET_KEY;
if (!secretKey) console.warn("Turnstile の秘密鍵が無いため、投稿時の人の確認を省きます");

startNodeServer({ human: secretKey ? humanVerifierFromEnv({ TURNSTILE_SECRET_KEY: secretKey, APP_ORIGIN: process.env.APP_ORIGIN }) : acceptingHumanVerifier });

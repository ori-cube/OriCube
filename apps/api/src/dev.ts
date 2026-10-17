import { createFixedUserVerifier, verifierFromEnv } from "./auth";
import { startNodeServer } from "./node";

// 開発用の入口（pnpm dev:api）。Clerk のキーが無ければ、固定の開発ユーザーでログインしている扱いにして投稿を確かめられるようにする
const env = {
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  APP_ORIGIN: process.env.APP_ORIGIN,
};
const DEV_USER_ID = "dev_user";
const hasClerk = Boolean(env.CLERK_SECRET_KEY && env.CLERK_PUBLISHABLE_KEY);
if (!hasClerk) console.warn(`Clerk のキーが無いため、開発ユーザー（${DEV_USER_ID}）でログインしている扱いにします`);

startNodeServer({ auth: hasClerk ? verifierFromEnv(env) : createFixedUserVerifier(DEV_USER_ID) });

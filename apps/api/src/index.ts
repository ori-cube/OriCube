import { humanVerifierFromEnv } from "./humanCheck";
import { startNodeServer } from "./node";

startNodeServer({
  human: humanVerifierFromEnv({ TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY, APP_ORIGIN: process.env.APP_ORIGIN }),
});

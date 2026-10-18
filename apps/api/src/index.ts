import { verifierFromEnv } from "./auth";
import { startNodeServer } from "./node";

startNodeServer({
  auth: verifierFromEnv({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    APP_ORIGIN: process.env.APP_ORIGIN,
  }),
});

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app";
import { verifierFromEnv } from "./auth";
import { createServerApp } from "./pages";

const port = Number(process.env.PORT ?? 8787);
// ビルド済みの画面。開発時（pnpm dev:web）はViteが画面を返すため、無ければAPIだけを起動する
const webDist = path.resolve(process.env.WEB_DIST_DIR ?? path.join(import.meta.dirname, "../../web/dist"));
const indexHtml = path.join(webDist, "index.html");

const createServer = () => {
  if (!existsSync(indexHtml)) return app;
  const root = path.relative(process.cwd(), webDist);
  return createServerApp({
    template: readFileSync(indexHtml, "utf8"),
    origin: process.env.APP_ORIGIN,
    auth: verifierFromEnv({
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
      APP_ORIGIN: process.env.APP_ORIGIN,
    }),
    assets: serveStatic({ root }),
  });
};

serve({ fetch: createServer().fetch, port }, (info) => {
  const mode = existsSync(indexHtml) ? `画面: ${webDist}` : "APIのみ";
  console.log(`OriCube: http://localhost:${info.port} （${mode}）`);
});

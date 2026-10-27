import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app";
import type { HumanVerifier } from "./humanCheck";
import { createServerApp } from "./pages";

/** Node.js で画面とAPIを起動する（本番相当は index.ts、開発は dev.ts） */
export const startNodeServer = ({ human }: { human: HumanVerifier }) => {
  const port = Number(process.env.PORT ?? 8787);
  // ビルド済みの画面。開発時（pnpm dev:web）はViteが画面を返すため、無ければAPIだけを起動する
  const webDist = path.resolve(process.env.WEB_DIST_DIR ?? path.join(import.meta.dirname, "../../web/dist"));
  const indexHtml = path.join(webDist, "index.html");
  const hasWeb = existsSync(indexHtml);

  const server = hasWeb
    ? createServerApp({
        template: readFileSync(indexHtml, "utf8"),
        origin: process.env.APP_ORIGIN,
        human,
        assets: serveStatic({ root: path.relative(process.cwd(), webDist) }),
      })
    : createApp({ human });

  serve({ fetch: server.fetch, port }, (info) => {
    console.log(`OriCube: http://localhost:${info.port} （${hasWeb ? `画面: ${webDist}` : "APIのみ"}）`);
  });
};

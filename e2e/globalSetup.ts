import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
let server: ChildProcess | undefined;

/** ビルド済みの画面（apps/web/dist）と、E2E 用の入口（apps/api/src/e2e.ts）の API を起動する */
export async function setup({ provide }: { provide: (key: "origin", value: string) => void }) {
  const port = 8600 + Math.floor(Math.random() * 90);
  const origin = `http://127.0.0.1:${port}`;
  server = spawn(path.join(root, "apps/api/node_modules/.bin/tsx"), ["--tsconfig", "tsconfig.json", "src/e2e.ts"], {
    cwd: path.join(root, "apps/api"),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "inherit"],
  });
  let output = "";
  server.stdout?.on("data", (chunk) => { output += chunk; });
  const deadline = Date.now() + 30_000;
  while (!output.includes("画面:")) {
    if (output.includes("APIのみ")) throw new Error("apps/web/dist がありません。先に pnpm build:web を実行してください");
    if (server.exitCode !== null || Date.now() > deadline) throw new Error(`E2E のサーバーが起動しませんでした\n${output}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  provide("origin", origin);
}

export async function teardown() {
  server?.kill();
}

declare module "vitest" {
  export interface ProvidedContext {
    origin: string;
  }
}

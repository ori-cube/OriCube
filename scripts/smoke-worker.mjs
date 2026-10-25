// ビルド済みの画面（apps/web/dist）と Worker を wrangler dev（workerd）で起動し、Workers の実行環境で動くことを確かめる。
// wrangler deploy --dry-run はバンドルしか確かめず、Node.js のスモークテスト（smoke-app.mjs）は workerd の制約
// （グローバルスコープで乱数・非同期処理を使えない など）を確かめられないため、両方を補う
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = fileURLToPath(new URL("../apps/api/", import.meta.url));
const port = 8700 + Math.floor(Math.random() * 90);
const origin = `http://127.0.0.1:${port}`;
const state = mkdtempSync(path.join(tmpdir(), "oricube-worker-"));
const wrangler = path.join(apiDir, "node_modules/.bin/wrangler");
const env = { ...process.env, WRANGLER_SEND_METRICS: "false" };
// 本番と同じく、ローカルの D1 に migrations を適用してから起動する
execFileSync(wrangler, ["d1", "migrations", "apply", "oricube", "--local", "--persist-to", state], { cwd: apiDir, env, stdio: ["ignore", "ignore", "inherit"] });
let output = "";
const worker = spawn(wrangler, ["dev", "--test-scheduled", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", state, "--show-interactive-dev-session=false"], {
  cwd: apiDir,
  env,
  stdio: ["ignore", "pipe", "pipe"],
  // wrangler が起動する workerd ごと止めるため、プロセスグループにする
  detached: true,
});
worker.stdout.on("data", (chunk) => { output += chunk; });
worker.stderr.on("data", (chunk) => { output += chunk; });

const failures = [];
const check = (name, ok) => {
  console.log(`${ok ? "ok" : "NG"} - ${name}`);
  if (!ok) failures.push(name);
};
const get = async (pathname, init) => {
  const res = await fetch(origin + pathname, { ...init, signal: AbortSignal.timeout(10_000) });
  return { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text() };
};

try {
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (worker.exitCode !== null) throw new Error("wrangler dev が終了しました");
    if (Date.now() > deadline) throw new Error("Worker が起動しませんでした");
    if (output.includes("Ready on")) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const list = await get("/api/models");
  check("/api/models は200のJSON", list.status === 200 && JSON.parse(list.body).items.some((item) => item.id === "crane"));
  const view = await get("/view/crane");
  check("/view/crane は200のHTMLでOGPが入る", view.status === 200 && view.body.includes(`<meta property="og:url" content="${origin}/view/crane" />`));
  const script = view.body.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  check("ビルド済みのJSを静的配信する", Boolean(script) && (await get(script)).status === 200);
  check("存在しない作品は404", (await get("/view/unknown")).status === 404);
  const post = await get("/api/models", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: "{}" });
  check("ログインしていない投稿は401", post.status === 401);
  // 掃除（src/cleanup.ts）を workerd の D1・R2 で実行できる
  check("定期実行（scheduled）を呼べる", (await get("/__scheduled?cron=17+3+*+*+*")).status === 200);
  for (let waited = 0; !output.includes("掃除しました") && waited < 5000; waited += 250) await new Promise((resolve) => setTimeout(resolve, 250));
  check("定期実行で掃除を最後まで行う", output.includes("掃除しました"));
  check("Worker の実行時エラーがない", !/Uncaught|Disallowed operation/.test(output));
} catch (error) {
  console.error(error);
  failures.push("起動");
} finally {
  try { process.kill(-worker.pid, "SIGTERM"); } catch { /* すでに終了している */ }
  rmSync(state, { recursive: true, force: true });
}

if (failures.length) {
  console.error(output);
  console.error(`${failures.length}件失敗しました`);
  process.exit(1);
}

// ビルド済みのv2（apps/api/dist と apps/web/dist）を起動し、画面・API・404・OGPを確かめる
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const port = 8900 + Math.floor(Math.random() * 90);
const origin = `http://localhost:${port}`;
const server = spawn(process.execPath, ["dist/index.js"], {
  cwd: fileURLToPath(new URL("../apps/api/", import.meta.url)),
  env: { ...process.env, PORT: String(port), APP_ORIGIN: "https://oricube.example" },
  stdio: ["ignore", "pipe", "inherit"],
});

const failures = [];
const check = (name, ok) => {
  console.log(`${ok ? "ok" : "NG"} - ${name}`);
  if (!ok) failures.push(name);
};

try {
  const [line] = await Promise.race([
    once(server.stdout, "data"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("サーバーが起動しませんでした")), 10_000)),
  ]);
  check("画面付きで起動する", String(line).includes("画面:"));

  const get = async (path) => {
    const res = await fetch(origin + path);
    return { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text() };
  };

  const view = await get("/view/crane");
  check("/view/crane は200のHTML", view.status === 200 && view.type.includes("text/html"));
  check("/view/crane にOGPが入る", view.body.includes(`<meta property="og:url" content="https://oricube.example/view/crane" />`));
  const script = view.body.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  check("ビルド済みのJSを返す", Boolean(script) && (await get(script)).status === 200);
  check("/post は200", (await get("/post")).status === 200);
  check("存在しない作品は404のHTML", (await get("/view/unknown")).status === 404);
  check("未定義のURLは404", (await get("/nope")).status === 404);
  const api = await get("/api/models/crane");
  check("/api/models/crane は200のJSON", api.status === 200 && JSON.parse(api.body).id === "crane");
  check("未定義のAPIは404のJSON", (await get("/api/nope")).type.includes("application/json"));
  const list = await get("/api/models");
  check("/api/models は公開済みの作品の一覧", list.status === 200 && JSON.parse(list.body).items.some((item) => item.id === "crane"));
  const post = await fetch(`${origin}/api/models`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: "{}" });
  check("ログインしていない投稿は401", post.status === 401);
} catch (error) {
  console.error(error);
  failures.push("起動");
} finally {
  server.kill();
}

if (failures.length) {
  console.error(`${failures.length}件失敗しました`);
  process.exit(1);
}

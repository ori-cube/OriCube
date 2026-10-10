import { readFileSync } from "node:fs";

const { packageManager } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
const expectedAgent = packageManager.replace("@", "/");
const actualAgent = process.env.npm_config_user_agent?.split(" ")[0];

if (actualAgent !== expectedAgent) {
  console.error(`このプロジェクトのインストールには ${packageManager} を使用してください。`);
  process.exit(1);
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const { packageManager } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
const script = fileURLToPath(new URL("./check-package-manager.mjs", import.meta.url));
const runCheck = (userAgent) => {
  const env = { ...process.env };
  delete env.npm_config_user_agent;
  if (userAgent !== undefined) env.npm_config_user_agent = userAgent;
  return spawnSync(process.execPath, [script], { env, encoding: "utf8" });
};

test("指定されたpnpmでインストールできる", () => {
  const result = runCheck(`${packageManager.replace("@", "/")} npm/? node/v22.0.0`);
  assert.equal(result.status, 0, result.stderr);
});

for (const userAgent of [
  undefined,
  "",
  "npm/11.0.0",
  "yarn/1.22.0",
  "pnpm/10.8.0",
  "pnpm/10.33.0-attacker",
  "npm/11.0.0 pnpm/10.33.0",
]) {
  test(`未指定・別のパッケージマネージャ・別バージョンを拒否する: ${userAgent}`, () => {
    const result = runCheck(userAgent);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /インストールには pnpm@/);
  });
}

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
// bracesを直接依存に追加すると、間接依存へのパッチ適用漏れを見逃すため、実際のCommitizen経路から読み込む。
const fromCommitizen = createRequire(require.resolve("commitizen"));
const fromFindNodeModules = createRequire(fromCommitizen.resolve("find-node-modules"));
const fromFindup = createRequire(fromFindNodeModules.resolve("findup-sync"));
const fromMicromatch = createRequire(fromFindup.resolve("micromatch"));
const braces = fromMicromatch("braces");

test("通常のbrace展開と範囲指定を維持する", () => {
  assert.deepEqual(braces.expand("src/{app,components}/*.{ts,tsx}"), [
    "src/app/*.ts", "src/app/*.tsx", "src/components/*.ts", "src/components/*.tsx",
  ]);
  assert.deepEqual(braces.expand("file-{1..3}.js"), ["file-1.js", "file-2.js", "file-3.js"]);
  assert.equal(braces.compile("a/{b,c}/d"), "a/(b|c)/d");
});

// バージョン監査はローカルパッチの効果を評価しないため、攻撃入力で拒否を確認する。
// 単に例外を期待すると、脆弱性そのもののRangeErrorも成功扱いになるため、深さ制限のSyntaxErrorを要求する。
// 対象: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
for (const api of ["parse", "compile", "expand", "stringify"]) {
  test(`深くネストした文字列をスタック枯渇前に拒否する: ${api}`, () => {
    const pattern = "{".repeat(2000) + "a,b" + "}".repeat(2000);
    assert.throws(() => braces[api](pattern), {
      name: "SyntaxError", message: /maximum nesting depth/,
    });
  });
}

// 文字列だけのテストでは、パーサーを通らず外部ASTを受け取る経路のガード漏れを見逃す。
for (const api of ["compile", "expand", "stringify"]) {
  test(`外部ASTの深い入れ子を拒否する: ${api}`, () => {
    let ast = { type: "text", value: "a" };
    for (let i = 0; i < 2000; i++) ast = { type: "brace", nodes: [ast] };
    assert.throws(() => braces[api](ast), {
      name: "SyntaxError", message: /maximum nesting depth/,
    });
  });
}

test("閉じられていない波括弧と丸括弧の深い入れ子も拒否する", () => {
  for (const pattern of ["{".repeat(2000), "(".repeat(2000) + "x" + ")".repeat(2000)]) {
    assert.throws(() => braces.compile(pattern), {
      name: "SyntaxError", message: /maximum nesting depth/,
    });
  }
});

// 括弧の個数だけを数える制限では、深い入れ子ではない正当なエスケープまで拒否してしまう。
test("エスケープされた波括弧は入れ子として扱わない", () => {
  const literal = "\\{".repeat(1000) + "a" + "\\}".repeat(1000);
  assert.equal(braces.compile(literal), "{".repeat(1000) + "a" + "}".repeat(1000));
});

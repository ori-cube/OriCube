import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { encode, decode, getToken } from "next-auth/jwt";

const require = createRequire(import.meta.url);
const fromTailwind = createRequire(require.resolve("tailwindcss/package.json"));
const fromMicromatch = createRequire(fromTailwind.resolve("micromatch"));
const braces = fromMicromatch("braces");
const secret = "test-only-secret-for-auth-regression";

test("認証セッションのJWTを発行しCookieから取得できる", async () => {
  const token = await encode({ secret, token: { sub: "user-123", email: "user@example.com" } });
  const session = await getToken({
    secret,
    req: { cookies: { "next-auth.session-token": token }, headers: {} },
  });
  assert.equal(session?.sub, "user-123");
  assert.equal(session?.email, "user@example.com");
});

test("誤った鍵・改ざん・期限切れのJWTを拒否する", async () => {
  const token = await encode({ secret, token: { sub: "user-123" } });
  await assert.rejects(decode({ secret: "wrong-secret", token }));
  const parts = token.split(".");
  parts[3] = `${parts[3][0] === "A" ? "B" : "A"}${parts[3].slice(1)}`;
  await assert.rejects(decode({ secret, token: parts.join(".") }));
  const expired = await encode({ secret, maxAge: -60, token: { sub: "user-123" } });
  await assert.rejects(decode({ secret, token: expired }));
});

test("通常のbrace展開と範囲指定を維持する", () => {
  assert.deepEqual(braces.expand("src/{app,components}/*.{ts,tsx}"), [
    "src/app/*.ts", "src/app/*.tsx", "src/components/*.ts", "src/components/*.tsx",
  ]);
  assert.deepEqual(braces.expand("file-{1..3}.js"), ["file-1.js", "file-2.js", "file-3.js"]);
  assert.equal(braces.compile("a/{b,c}/d"), "a/(b|c)/d");
});

for (const api of ["parse", "compile", "expand", "stringify"]) {
  test(`深くネストした文字列をスタック枯渇前に拒否する: ${api}`, () => {
    const pattern = "{".repeat(2000) + "a,b" + "}".repeat(2000);
    assert.throws(() => braces[api](pattern), {
      name: "SyntaxError", message: /maximum nesting depth/,
    });
  });
}

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

test("エスケープされた波括弧は入れ子として扱わない", () => {
  const literal = "\\{".repeat(1000) + "a" + "\\}".repeat(1000);
  assert.equal(braces.compile(literal), "{".repeat(1000) + "a" + "}".repeat(1000));
});

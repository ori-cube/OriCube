import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { createApp } from "./app";
import type { AuthVerifier } from "./auth";
import { craneProcedure } from "./mocks/crane";
import { createMemoryRateLimiter, WRITE_LIMIT, type RateLimiter } from "./rateLimit";

describe("createMemoryRateLimiter", () => {
  it("キーごとに期間内の回数を数え、上限を超えたら期間が終わるまで拒否する", async () => {
    let now = 0;
    const limiter = createMemoryRateLimiter({ limit: 2, periodMs: 1000, now: () => now });
    const results = async (key: string, times: number) => Promise.all(Array.from({ length: times }, () => limiter.limit({ key }))).then((list) => list.map((result) => result.success));
    expect(await results("a", 3)).toEqual([true, true, false]);
    expect(await results("b", 1)).toEqual([true]);
    now = 999;
    expect(await results("a", 1)).toEqual([false]);
    now = 1000;
    expect(await results("a", 2)).toEqual([true, true]);
  });
});

describe("書き込みの回数制限", () => {
  const auth: AuthVerifier = { authenticate: async (request) => request.headers.get("x-test-user") };
  const remove = (app: ReturnType<typeof createApp>, user: string) =>
    app.request("/api/models/unknown", { method: "DELETE", headers: { "Content-Type": "application/json", "x-test-user": user } });

  it(`ログインした人ごとに${WRITE_LIMIT}回を超えた書き込みは429にし、読み取りは制限しない`, async () => {
    const app = createApp({ auth });
    for (let index = 0; index < WRITE_LIMIT; index += 1) expect((await remove(app, "user_a")).status).toBe(404);
    const limited = await remove(app, "user_a");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    expect(await limited.json()).toMatchObject({ error: { code: "too_many_requests" } });
    // 投稿も同じ制限を受ける
    const post = await app.request("/api/models", { method: "POST", headers: { "Content-Type": "application/json", "x-test-user": "user_a" }, body: JSON.stringify({ name: "鶴", description: "", color: "#ed7070", procedure: craneProcedure, thumbnail: { contentType: "image/png", size: 8 } }) });
    expect(post.status).toBe(429);
    expect((await remove(app, "user_b")).status).toBe(404);
    expect((await app.request("/api/models")).status).toBe(200);
    expect((await app.request("/api/me/models", { headers: { "x-test-user": "user_a" } })).status).toBe(200);
  });

  it("未ログインの書き込みは回数に数えず401にする", async () => {
    const limiter = { limit: async () => ({ success: false }) } satisfies RateLimiter;
    const app = createApp({ auth, rateLimiter: limiter });
    expect((await app.request("/api/models/unknown", { method: "DELETE", headers: { "Content-Type": "application/json" } })).status).toBe(401);
  });

  it("Workers の Rate Limiting バインディング（wrangler のローカル環境）を使える", async () => {
    const proxy = await getPlatformProxy<{ WRITE_LIMITER: RateLimiter }>({ configPath: path.resolve(import.meta.dirname, "../wrangler.jsonc"), persist: false });
    try {
      const app = createApp({ auth, rateLimiter: proxy.env.WRITE_LIMITER });
      expect((await remove(app, "user_proxy")).status).toBe(404);
    } finally {
      await proxy.dispose();
    }
  }, 60_000);
});

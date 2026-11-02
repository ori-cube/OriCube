import { describe, expect, it, vi } from "vitest";
import { createTurnstileVerifier, humanVerifierFromEnv, rejectingHumanVerifier } from "./humanCheck";

const respond = (body: unknown, status = 200) => vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

describe("createTurnstileVerifier", () => {
  it("秘密鍵・トークン・接続元の IP を siteverify に送り、成功なら true", async () => {
    const fetch = respond({ success: true, hostname: "oricube.example" });
    const verifier = createTurnstileVerifier({ secretKey: "secret", hostname: "oricube.example", fetch });
    expect(await verifier.verify("token", "203.0.113.1")).toBe(true);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const form = init?.body as FormData;
    expect([form.get("secret"), form.get("response"), form.get("remoteip")]).toEqual(["secret", "token", "203.0.113.1"]);
  });

  it("失敗・別のホスト名・通信の失敗・空のトークンは false", async () => {
    expect(await createTurnstileVerifier({ secretKey: "s", fetch: respond({ success: false }) }).verify("t", null)).toBe(false);
    expect(await createTurnstileVerifier({ secretKey: "s", hostname: "oricube.example", fetch: respond({ success: true, hostname: "evil.example" }) }).verify("t", null)).toBe(false);
    expect(await createTurnstileVerifier({ secretKey: "s", fetch: respond({}, 500) }).verify("t", null)).toBe(false);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createTurnstileVerifier({ secretKey: "s", fetch: vi.fn(async () => { throw new Error("offline"); }) }).verify("t", null)).toBe(false);
    error.mockRestore();
    const fetch = respond({ success: true });
    expect(await createTurnstileVerifier({ secretKey: "s", fetch }).verify("", null)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("humanVerifierFromEnv", () => {
  it("秘密鍵が無ければ常に拒否する", () => {
    expect(humanVerifierFromEnv({})).toBe(rejectingHumanVerifier);
    expect(humanVerifierFromEnv({ TURNSTILE_SECRET_KEY: "s" })).not.toBe(rejectingHumanVerifier);
  });
});

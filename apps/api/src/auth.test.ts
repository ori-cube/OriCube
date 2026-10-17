import { describe, expect, it } from "vitest";
import { anonymousVerifier, verifierFromEnv } from "./auth";

describe("verifierFromEnv", () => {
  it("Clerkのキーが無ければ未ログイン扱いにする", async () => {
    const verifier = verifierFromEnv({});
    expect(verifier).toBe(anonymousVerifier);
    expect(await verifier.authenticate(new Request("https://oricube.example/api/models"))).toBeNull();
  });

  it("Clerkのキーがあれば別の検証を使う", () => {
    expect(verifierFromEnv({ CLERK_SECRET_KEY: "sk_test_x", CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k" })).not.toBe(anonymousVerifier);
  });
});

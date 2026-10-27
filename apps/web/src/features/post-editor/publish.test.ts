import { createApp, type AppType } from "@oricube/api";
import { craneProcedure } from "@oricube/api/mocks/crane";
import { hc } from "hono/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOrigami } from "../../apiClient";
import { submitErrorMessage } from "./publish";

const origin = "http://localhost";
const input = { name: "投稿した鶴", description: "説明", color: "#ed7070", procedure: craneProcedure };

let app: ReturnType<typeof createApp>;
let requests: string[];
/**
 * API へのリクエストを、メモリ上のアプリへ送る
 *
 * @description
 * ブラウザは同一オリジンの POST にも Origin を付ける（API の CSRF 対策はこれで同一オリジンと判断する）
 */
const route = (url: string | URL | Request, init?: RequestInit) => {
  const request = new Request(new URL(url instanceof Request ? url.url : url, origin), init);
  if (request.method !== "GET") request.headers.set("Origin", origin);
  requests.push(`${request.method} ${new URL(request.url).pathname}`);
  return app.request(request);
};
const client = () => hc<AppType>(origin, { fetch: route });

beforeEach(() => {
  app = createApp({ human: { verify: async (token) => token === "human" } });
  requests = [];
  vi.stubGlobal("fetch", vi.fn(route));
});
afterEach(() => vi.unstubAllGlobals());

describe("createOrigami", () => {
  it("作品を投稿し、サーバーが決めたIDと編集用の鍵を返す", async () => {
    const { id, editKey } = await createOrigami(client(), input, "human");
    expect(requests).toEqual(["POST /api/models"]);
    expect(editKey).toEqual(expect.any(String));
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ id, name: "投稿した鶴" });
  });

  it("人であることを確かめられなければ、もう一度確認するよう案内する", async () => {
    const error = await createOrigami(client(), input, "bot").catch((reason: unknown) => reason);
    expect(error).toMatchObject({ status: 403, code: "verification_failed" });
    expect(submitErrorMessage(error)).toContain("もう一度確認して");
  });

  it("投稿が続いて上限を超えたら、待つよう案内する", async () => {
    app = createApp({ human: { verify: async () => true }, postLimiter: { limit: async () => false } });
    const error = await createOrigami(client(), input, "human").catch((reason: unknown) => reason);
    expect(error).toMatchObject({ status: 429, code: "rate_limited" });
    expect(submitErrorMessage(error)).toContain("1分ほど待って");
  });
});

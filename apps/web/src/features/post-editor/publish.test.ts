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
  app = createApp({ auth: { authenticate: async () => "user_a" } });
  requests = [];
  vi.stubGlobal("fetch", vi.fn(route));
});
afterEach(() => vi.unstubAllGlobals());

describe("createOrigami", () => {
  it("作品を投稿し、サーバーが決めたIDを返す", async () => {
    const id = await createOrigami(client(), input);
    expect(requests).toEqual(["POST /api/models"]);
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ id, name: "投稿した鶴" });
  });

  it("ログインしていなければ、ログイン状態に合わせて案内する", async () => {
    app = createApp();
    const error = await createOrigami(client(), input).catch((reason: unknown) => reason);
    expect(error).toMatchObject({ status: 401, code: "unauthorized" });
    // ログイン中なら期限切れ、ログインの設定がない環境ならこの環境では投稿できないと伝える
    expect(submitErrorMessage(error, "signedIn")).toContain("もう一度ログイン");
    expect(submitErrorMessage(error, "unavailable")).toContain("この環境では投稿できません");
  });
});

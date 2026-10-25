import { createApp, type AppType } from "@oricube/api";
import { craneProcedure } from "@oricube/api/mocks/crane";
import { hc } from "hono/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../apiClient";
import { submitErrorMessage, submitOrigami, submitUpdate, type PendingSubmission } from "./publish";

const origin = "http://localhost";
const input = { name: "投稿した鶴", description: "説明", color: "#ed7070", procedure: craneProcedure };
const image = (bytes = 8) => new Blob([new Uint8Array(bytes)], { type: "image/png" });

let app: ReturnType<typeof createApp>;
let requests: string[];
/**
 * API とサムネイルの保存先（モック）へのリクエストを、メモリ上のアプリへ送る
 *
 * @description
 * ブラウザは同一オリジンの POST・PUT にも Origin を付ける（API の CSRF 対策はこれで同一オリジンと判断する）
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

describe("submitOrigami", () => {
  it("作品を作り、サムネイルを置いてから公開する", async () => {
    const onPending = vi.fn();
    const id = await submitOrigami({ client: client(), input, thumbnail: image(), previous: null, onPending });
    expect(requests).toEqual(["POST /api/models", expect.stringMatching(/^PUT \/api\/mock-storage\/uploads\//), `POST /api/models/${id}/publish`]);
    expect(onPending).toHaveBeenCalledWith(expect.objectContaining({ id }));
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ id, name: "投稿した鶴" });
    const { items } = (await (await app.request("/api/models")).json()) as { items: { id: string; thumbnailUrl: string | null }[] };
    expect(items[0]).toMatchObject({ id, thumbnailUrl: expect.stringContaining(`/thumbnails/${id}/`) });
  });

  it("途中で失敗しても、同じ内容の再試行では作品を作り直さない", async () => {
    let pending: PendingSubmission | null = null;
    const thumbnail = image();
    const upload = vi.fn<typeof route>().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockImplementation(route);
    vi.stubGlobal("fetch", upload);
    await expect(submitOrigami({ client: client(), input, thumbnail, previous: pending, onPending: (next) => { pending = next; } })).rejects.toThrow("Failed to fetch");
    expect(pending).not.toBeNull();
    const id = await submitOrigami({ client: client(), input, thumbnail, previous: pending, onPending: (next) => { pending = next; } });
    expect(id).toBe(pending!.id);
    expect(requests.filter((request) => request === "POST /api/models")).toHaveLength(1);
  });

  it("撮り直したサムネイルはアップロード先だけを作り直す。内容が変われば別の作品にする", async () => {
    let pending: PendingSubmission | null = null;
    const onPending = (next: PendingSubmission) => { pending = next; };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 })));
    await expect(submitOrigami({ client: client(), input, thumbnail: image(), previous: null, onPending })).rejects.toThrow(ApiRequestError);
    vi.stubGlobal("fetch", vi.fn(route));
    const first = pending!;
    const id = await submitOrigami({ client: client(), input, thumbnail: image(12), previous: first, onPending });
    expect(id).toBe(first.id);
    expect(requests).toContain(`POST /api/models/${first.id}/thumbnail-upload`);

    const other = await submitOrigami({ client: client(), input: { ...input, name: "別の鶴" }, thumbnail: image(), previous: first, onPending });
    expect(other).not.toBe(first.id);
  });

  it("アップロード先の期限が切れていたら作り直して送る", async () => {
    let pending: PendingSubmission | null = null;
    const thumbnail = image();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 })));
    await expect(submitOrigami({ client: client(), input, thumbnail, previous: null, onPending: (next) => { pending = next; } })).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn(route));
    const id = await submitOrigami({ client: client(), input, thumbnail, previous: pending, onPending: (next) => { pending = next; }, now: () => Date.parse(pending!.thumbnailUpload.expiresAt) + 1 });
    expect(requests).toContain(`POST /api/models/${id}/thumbnail-upload`);
  });

  it("保存先に拒否されたら1回だけアップロード先を作り直す", async () => {
    const forbidden = vi.fn<typeof route>().mockResolvedValueOnce(new Response(null, { status: 403 })).mockImplementation(route);
    vi.stubGlobal("fetch", forbidden);
    const id = await submitOrigami({ client: client(), input, thumbnail: image(), previous: null, onPending: () => {} });
    expect(requests).toContain(`POST /api/models/${id}/thumbnail-upload`);
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ id });
  });

  it("ログインしていなければ、ログイン状態に合わせて案内する", async () => {
    app = createApp();
    const error = await submitOrigami({ client: client(), input, thumbnail: image(), previous: null, onPending: () => {} }).catch((reason: unknown) => reason);
    expect(error).toMatchObject({ status: 401, code: "unauthorized" });
    // ログイン中なら期限切れ、ログインの設定がない環境ならこの環境では投稿できないと伝える
    expect(submitErrorMessage(error, "signedIn")).toContain("もう一度ログイン");
    expect(submitErrorMessage(error, "unavailable")).toContain("この環境では投稿できません");
  });
});

describe("submitUpdate", () => {
  const thumbnailUrl = async (id: string) => {
    const { items } = (await (await app.request("/api/models")).json()) as { items: { id: string; thumbnailUrl: string | null }[] };
    return items.find((item) => item.id === id)?.thumbnailUrl;
  };

  it("撮り直さなければ内容だけを同じIDで上書きし、サムネイルはそのまま", async () => {
    const id = await submitOrigami({ client: client(), input, thumbnail: image(), previous: null, onPending: vi.fn() });
    const before = await thumbnailUrl(id);
    requests = [];
    expect(await submitUpdate({ client: client(), id, input: { ...input, name: "直した鶴", visibility: "unlisted" }, thumbnail: null })).toBe(id);
    expect(requests).toEqual([`PUT /api/models/${id}`]);
    expect(await (await app.request(`/api/models/${id}`)).json()).toMatchObject({ id, name: "直した鶴", visibility: "unlisted" });
    // 限定公開にしたので一覧には出ない。公開に戻して画像が変わっていないことを確かめる
    await submitUpdate({ client: client(), id, input, thumbnail: null });
    expect(await thumbnailUrl(id)).toBe(before);
  });

  it("撮り直したサムネイルを置いてから差し替え、古い画像を消す", async () => {
    const id = await submitOrigami({ client: client(), input, thumbnail: image(), previous: null, onPending: vi.fn() });
    const before = await thumbnailUrl(id) ?? "";
    requests = [];
    await submitUpdate({ client: client(), id, input, thumbnail: image(4) });
    expect(requests).toEqual([`PUT /api/models/${id}`, `POST /api/models/${id}/thumbnail-upload`, expect.stringMatching(/^PUT \/api\/mock-storage\/uploads\//), `PUT /api/models/${id}/thumbnail`]);
    const after = await thumbnailUrl(id) ?? "";
    expect(after).not.toBe(before);
    expect((await app.request(after)).status).toBe(200);
    expect((await app.request(before)).status).toBe(404);
  });

  it("他人の作品・消えた作品は、理由を案内する", async () => {
    let user = "user_a";
    app = createApp({ auth: { authenticate: async () => user } });
    const id = await submitOrigami({ client: client(), input, thumbnail: image(), previous: null, onPending: vi.fn() });
    user = "user_b";
    const forbidden = await submitUpdate({ client: client(), id, input, thumbnail: null }).catch((error: unknown) => error);
    expect(submitErrorMessage(forbidden)).toContain("この作品を変更する権限がありません");
    user = "user_a";
    expect((await app.request(`/api/models/${id}`, { method: "DELETE", headers: { Origin: origin } })).status).toBe(204);
    const missing = await submitUpdate({ client: client(), id, input, thumbnail: null }).catch((error: unknown) => error);
    expect(submitErrorMessage(missing)).toContain("見つかりません");
  });
});

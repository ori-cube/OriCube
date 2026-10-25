import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { AuthVerifier } from "./auth";
import { CLEANUP_AFTER_MS, cleanupStaleUploads } from "./cleanup";
import { craneProcedure } from "./mocks/crane";
import { createMemoryOrigamiRepository } from "./repository";
import { createMemoryThumbnailStorage } from "./storage";

const auth: AuthVerifier = { authenticate: async (request) => request.headers.get("x-test-user") };
const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const thumbnail = { contentType: "image/png", size: image.byteLength };
const input = { name: "鶴", description: "", color: "#ed7070", procedure: craneProcedure };
const DAY = CLEANUP_AFTER_MS;

/** 時刻を進められる保存先とアプリ */
const setup = () => {
  let now = 0;
  const clock = () => now;
  const repository = createMemoryOrigamiRepository([], { now: clock });
  // 署名の期限も同じ時計で確かめる
  const storage = createMemoryThumbnailStorage({ now: clock });
  const app = createApp({ repository, storage, auth });
  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, { method, headers: { "Content-Type": "application/json", "x-test-user": "user_a" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const upload = (target: { url: string; headers: Record<string, string> }) => app.request(target.url, { method: "PUT", headers: target.headers, body: image });
  const createPending = async () => (await (await send("POST", "/api/models", { ...input, thumbnail })).json()) as { id: string; thumbnailUpload: { url: string; headers: Record<string, string> } };
  const publish = async () => {
    const { id, thumbnailUpload } = await createPending();
    await upload(thumbnailUpload);
    await send("POST", `/api/models/${id}/publish`);
    return id;
  };
  return { repository, storage, send, upload, createPending, publish, at: (time: number) => { now = time; }, run: () => cleanupStaleUploads({ repository, storage, now }) };
};

const keys = async (storage: ReturnType<typeof createMemoryThumbnailStorage>) => (await storage.list()).objects.map((object) => object.key);

describe("cleanupStaleUploads", () => {
  it("1日を過ぎても公開されない作品を、サムネイルごと消す", async () => {
    const { repository, storage, upload, createPending, publish, at, run } = setup();
    const stale = await createPending();
    await upload(stale.thumbnailUpload);
    const published = await publish();
    at(DAY - 1);
    const fresh = await createPending();
    expect(await run()).toEqual({ pendingModels: 0, orphanThumbnails: 0 });

    at(DAY + 1);
    expect(await run()).toEqual({ pendingModels: 1, orphanThumbnails: 0 });
    expect(await repository.findById(stale.id)).toBeNull();
    expect(await repository.findById(fresh.id)).not.toBeNull();
    expect(await repository.findById(published)).toMatchObject({ status: "published" });
    expect(await keys(storage)).toEqual([(await repository.findById(published))?.thumbnail?.key]);
  });

  it("どの作品の今のサムネイルでもない画像を、1日を過ぎたら消す", async () => {
    const { repository, storage, send, upload, publish, at, run } = setup();
    const id = await publish();
    const current = (await repository.findById(id))?.thumbnail?.key;
    // 再編集で撮り直したが差し替えなかった画像
    const retake = (await (await send("POST", `/api/models/${id}/thumbnail-upload`, thumbnail)).json()) as { thumbnailUpload: { url: string; headers: Record<string, string> }; thumbnailKey: string };
    await upload(retake.thumbnailUpload);
    // 削除済みの作品に残った画像（削除時に消せなかった場合）
    const removed = await publish();
    const removedKey = (await repository.findById(removed))?.thumbnail?.key;
    await repository.delete(removed);

    at(DAY - 1);
    expect(await run()).toEqual({ pendingModels: 0, orphanThumbnails: 0 });
    expect(await keys(storage)).toHaveLength(3);
    at(DAY + 1);
    expect(await run()).toEqual({ pendingModels: 0, orphanThumbnails: 2 });
    expect(await keys(storage)).toEqual([current]);
    expect(removedKey).toBeDefined();
  });

  it("差し替え待ちの新しい画像と、公開済みの作品の今の画像は消さない", async () => {
    const { repository, storage, send, upload, publish, at, run } = setup();
    const id = await publish();
    at(DAY + 1);
    const retake = (await (await send("POST", `/api/models/${id}/thumbnail-upload`, thumbnail)).json()) as { thumbnailUpload: { url: string; headers: Record<string, string> } };
    await upload(retake.thumbnailUpload);
    expect(await run()).toEqual({ pendingModels: 0, orphanThumbnails: 0 });
    expect(await keys(storage)).toHaveLength(2);
    expect(await repository.findById(id)).toMatchObject({ status: "published" });
  });
});

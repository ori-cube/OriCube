import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { getOrigamiV2 } from "@/features/origami-viewer-v2/repository";

describe("GET /api/models/:id", () => {
  it("検証済みの作品を返す", async () => {
    const res = await createApp().request("/api/models/crane");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(await getOrigamiV2("crane"));
  });

  it("手順がない作品も返す", async () => {
    const res = await createApp().request("/api/models/blank-paper");
    expect(res.status).toBe(200);
  });

  it("存在しない作品は404を返す", async () => {
    const res = await createApp().request("/api/models/unknown");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "作品が見つかりません。" } });
  });

  it("IDの形式が正しくなければ400を返す", async () => {
    const res = await createApp().request(`/api/models/${"a".repeat(65)}`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "invalid_request" } });
  });

  it("保存済みの値が不正なら中身を返さず500にする", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp({ repository: { findById: async () => ({ id: "broken", name: "壊れた作品", description: "", color: "#ffffff", procedure: { version: 2, size: -1 } }) } });
    const res = await app.request("/api/models/broken");
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: { code: "internal_error" } });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("取得元の例外は500の共通形式で返す", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp({ repository: { findById: async () => { throw new Error("DBに接続できません"); } } });
    const res = await app.request("/api/models/crane");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal_error", message: "サーバーでエラーが発生しました。" } });
    error.mockRestore();
  });
});

describe("共通の振る舞い", () => {
  it("未定義のAPIは404の共通形式で返す", async () => {
    const res = await createApp().request("/api/unknown");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "not_found" } });
  });

  it("大きすぎるリクエストは413を返す", async () => {
    const res = await createApp().request("/api/models/crane", { method: "POST", body: "x".repeat(1024 * 1024 + 1), headers: { "Content-Length": String(1024 * 1024 + 1) } });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: { code: "payload_too_large" } });
  });
});

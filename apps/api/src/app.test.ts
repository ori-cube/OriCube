import { describe, expect, it, vi } from "vitest";
import { createApp, MODELS_PAGE_SIZE } from "./app";
import { createMemoryOrigamiRepository } from "./repository";
import { getOrigamiV2 } from "./mocks/models";

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
    const app = createApp({ repository: createMemoryOrigamiRepository([{ ownerId: null, model: { id: "broken", name: "壊れた作品", description: "", color: "#ffffff", procedure: { version: 2, size: -1 } } }]) });
    const res = await app.request("/api/models/broken");
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: { code: "internal_error" } });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("取得元の例外は500の共通形式で返す", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp({ repository: { ...createMemoryOrigamiRepository(), findById: async () => { throw new Error("DBに接続できません"); } } });
    const res = await app.request("/api/models/crane");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal_error", message: "サーバーでエラーが発生しました。" } });
    error.mockRestore();
  });
});

describe("GET /api/models", () => {
  type ListBody = { items: { id: string; thumbnail: { faces: unknown[] } }[]; total: number; page: number; totalPages: number };
  const list = async (app: ReturnType<typeof createApp>, path: string) => (await app.request(path)).json() as Promise<ListBody>;
  const seed = (count: number) => createMemoryOrigamiRepository(Array.from({ length: count }, (_, index) => ({
    ownerId: null,
    model: { id: `m${index}`, name: `作品${index}`, description: "", color: "#ffffff", procedure: { version: 2, size: 100, steps: [], history: [], finalBoards: [{ polygon: [[-50, -50, 0], [50, -50, 0], [50, 50, 0], [-50, 50, 0]], layer: 0 }] } },
  })));

  it("手順の本体を含めず、要約と完成形のサムネイルを返す", async () => {
    const res = await createApp().request("/api/models");
    expect(res.status).toBe(200);
    const body = await res.json() as ListBody;
    expect(body).toMatchObject({ total: 2, page: 1, totalPages: 1 });
    expect(body.items.map((item) => item.id)).toEqual(["crane", "blank-paper"]);
    expect(body.items[0]).toMatchObject({ name: "鶴", color: "#ed7070", stepCount: 21 });
    expect(body.items[0].thumbnail.faces.length).toBeGreaterThan(0);
    expect(body.items[0]).not.toHaveProperty("procedure");
  });

  it("名前と説明を、全角・半角や大文字・小文字の違いを無視して検索する", async () => {
    for (const q of ["鶴", "ｕｉ", " UI "]) {
      const body = await list(createApp(), `/api/models?q=${encodeURIComponent(q)}`);
      expect(body.items.map((item) => item.id)).toEqual(["crane"]);
    }
    const none = await list(createApp(), "/api/models?q=%E3%81%8B%E3%81%88%E3%82%8B");
    expect(none).toMatchObject({ items: [], total: 0, totalPages: 1 });
  });

  it("ページに分けて返す", async () => {
    const app = createApp({ repository: seed(MODELS_PAGE_SIZE + 1) });
    const first = await list(app, "/api/models");
    expect(first).toMatchObject({ total: MODELS_PAGE_SIZE + 1, page: 1, totalPages: 2 });
    expect(first.items).toHaveLength(MODELS_PAGE_SIZE);
    const second = await list(app, "/api/models?page=2");
    expect(second.items.map((item) => item.id)).toEqual([`m${MODELS_PAGE_SIZE}`]);
  });

  it("投稿した作品を新しい順に先頭へ並べる", async () => {
    const repository = seed(2);
    const model = { name: "新作", description: "", color: "#ffffff", procedure: { version: 2 as const, size: 100, steps: [], history: [], finalBoards: [] } };
    await repository.create({ ownerId: "user_1", model: { id: "new1", ...model } });
    await repository.create({ ownerId: "user_1", model: { id: "new2", ...model } });
    await repository.delete("m0");
    const body = await list(createApp({ repository }), "/api/models");
    expect(body.items.map((item) => item.id)).toEqual(["new2", "new1", "m1"]);
  });

  it("検索条件の形式が正しくなければ400を返す", async () => {
    for (const query of ["page=0", "page=abc", `q=${"a".repeat(101)}`]) {
      const res = await createApp().request(`/api/models?${query}`);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: { code: "invalid_request" } });
    }
  });

  it("形式が正しくない作品は一覧から除いて記録する", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const repository = seed(1);
    await repository.create({ ownerId: "user_1", model: { id: "broken" } as never });
    const body = await list(createApp({ repository }), "/api/models");
    expect(body.items.map((item) => item.id)).toEqual(["m0"]);
    expect(error).toHaveBeenCalled();
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

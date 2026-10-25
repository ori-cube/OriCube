import { describe, expect, it } from "vitest";
import { api, origin } from "./browser";

/** 鶴のモックを元にした作品の内容（ID以外） */
const craneInput = async () => {
  const { id: _id, ...input } = await (await api("/api/models/crane")).json();
  return input;
};
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** user で投稿し、サムネイルを置いて公開する */
const publishAs = async (user: string, name: string) => {
  const created = await api("/api/models", { user, method: "POST", body: { ...await craneInput(), name, thumbnail: { contentType: "image/png", size: png.byteLength } } });
  expect(created.status).toBe(201);
  const { id, thumbnailUpload } = await created.json();
  expect((await fetch(origin() + thumbnailUpload.url, { method: "PUT", headers: thumbnailUpload.headers, body: png })).status).toBe(200);
  expect((await api(`/api/models/${id}/publish`, { user, method: "POST" })).status).toBe(200);
  return id as string;
};

describe("API の認可（#100 の完了条件）", () => {
  it("未ログインの投稿・更新・削除を拒否する", async () => {
    const input = await craneInput();
    expect((await api("/api/models", { method: "POST", body: { ...input, thumbnail: { contentType: "image/png", size: 8 } } })).status).toBe(401);
    expect((await api("/api/models/crane", { method: "PUT", body: input })).status).toBe(401);
    expect((await api("/api/models/crane", { method: "DELETE" })).status).toBe(401);
    expect((await api("/api/me/models")).status).toBe(401);
  });

  it("所有者以外の更新・削除・サムネイルの差し替えを拒否し、所有者はできる", async () => {
    const id = await publishAs("e2e_owner", "所有者の鶴");
    const input = await craneInput();
    expect((await api(`/api/models/${id}`, { user: "e2e_other", method: "PUT", body: { ...input, name: "乗っ取り" } })).status).toBe(403);
    expect((await api(`/api/models/${id}`, { user: "e2e_other", method: "DELETE" })).status).toBe(403);
    expect((await api(`/api/models/${id}/thumbnail-upload`, { user: "e2e_other", method: "POST", body: { contentType: "image/png", size: 8 } })).status).toBe(403);
    expect(await (await api(`/api/models/${id}`)).json()).toMatchObject({ name: "所有者の鶴" });
    // 他の人の「自分の作品」には出ない
    const others = await (await api("/api/me/models", { user: "e2e_other" })).json();
    expect(others.items.map((item: { id: string }) => item.id)).not.toContain(id);

    expect((await api(`/api/models/${id}`, { user: "e2e_owner", method: "PUT", body: { ...input, name: "直した鶴" } })).status).toBe(200);
    expect((await api(`/api/models/${id}`, { user: "e2e_owner", method: "DELETE" })).status).toBe(204);
    expect((await api(`/api/models/${id}`)).status).toBe(404);
    // 作品ページも404になる
    expect((await fetch(`${origin()}/view/${id}`)).status).toBe(404);
  });

  it("鶴などの所有者のいない作品は、誰も変更・削除できない", async () => {
    expect((await api("/api/models/crane", { user: "e2e_owner", method: "PUT", body: await craneInput() })).status).toBe(403);
    expect((await api("/api/models/crane", { user: "e2e_owner", method: "DELETE" })).status).toBe(403);
  });

  it("他のサイトからのフォーム送信を拒否する", async () => {
    const res = await fetch(`${origin()}/api/models`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://evil.example", Cookie: "e2e_user=e2e_owner" }, body: "name=x" });
    expect(res.status).toBe(403);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createServerApp, renderPage } from "./pages";
import { createMemoryOrigamiRepository } from "./repository";

const template = `<!doctype html><html><head>
    <!-- page-meta:start -->
    <title>OriCube</title>
    <!-- page-meta:end -->
  </head><body><div id="root"></div></body></html>`;

const app = createServerApp({ template, origin: "https://oricube.example" });
const html = async (path: string) => {
  const res = await app.request(path);
  return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
};

describe("renderPage", () => {
  it("目印の間をmetaに置き換え、値をエスケープする", () => {
    const page = renderPage(template, { title: `<script>"鶴"</script>`, description: "a & b", url: "https://x/view/a", image: "https://x/a.png" });
    expect(page).toContain("<title>&lt;script&gt;&quot;鶴&quot;&lt;/script&gt;</title>");
    expect(page).toContain(`<meta property="og:description" content="a &amp; b" />`);
    expect(page).not.toContain("<script>");
    expect(page).not.toContain("page-meta");
  });

  it("目印がないテンプレートは起動時に失敗させる", () => {
    expect(() => createServerApp({ template: "<html></html>" })).toThrow("page-meta");
  });
});

describe("画面の配信", () => {
  it("作品ページは作品名と説明をOGPに入れて返す", async () => {
    const page = await html("/view/crane");
    expect(page.status).toBe(200);
    expect(page.type).toContain("text/html");
    expect(page.body).toContain("<title>鶴の折り方 | OriCube</title>");
    expect(page.body).toContain(`<meta property="og:description" content="UIで折った鶴の手順です。" />`);
    expect(page.body).toContain(`<meta property="og:url" content="https://oricube.example/view/crane" />`);
    expect(page.body).toContain(`<meta property="og:image" content="https://oricube.example/api/models/crane/thumbnail.png" />`);
    expect(page.body).toContain(`<div id="root"></div>`);
  });

  it.each(["/view/unknown", `/view/${"a".repeat(65)}`, "/v2/view/crane", "/unknown"])("%sはHTTP 404でSPAを返す", async (path) => {
    const page = await html(path);
    expect(page.status).toBe(404);
    expect(page.body).toContain(`<meta name="robots" content="noindex" />`);
    expect(page.body).toContain(`<div id="root"></div>`);
  });

  it.each(["/", "/view", "/post"])("%sは200でSPAを返す", async (path) => {
    expect((await html(path)).status).toBe(200);
  });

  it("APIは同じオリジンで返し、未定義のAPIはJSONの404にする", async () => {
    expect((await app.request("/api/models/crane")).status).toBe(200);
    const res = await app.request("/api/unknown");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "not_found" } });
  });

  it("同一オリジン配信でも他サイトからのフォーム送信はJSONの403にする", async () => {
    const res = await app.request("/api/models", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://evil.example" }, body: "name=x" });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: "forbidden" } });
  });

  it("限定公開の作品ページは検索結果に出さない", async () => {
    const unlisted = createServerApp({ template, repository: createMemoryOrigamiRepository([{ editKeyHash: "hash_user_a", model: { id: "secret", name: "ひみつの鶴", description: "", color: "#ffffff", procedure: { version: 2, size: 100, steps: [], history: [], finalBoards: [] }, visibility: "unlisted" } }]) });
    const res = await unlisted.request("/view/secret");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`<meta name="robots" content="noindex" />`);
    expect(await (await html("/view/crane")).body).not.toContain("noindex");
  });

  it("保存済みの値が不正な作品ページは500にする", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = createServerApp({ template, repository: createMemoryOrigamiRepository([{ editKeyHash: null, model: { id: "broken" } }]) });
    const res = await broken.request("/view/broken");
    expect(res.status).toBe(500);
    expect(await res.text()).toContain(`<meta name="robots" content="noindex" />`);
    error.mockRestore();
  });
});

describe("静的ファイル", () => {
  it("/assets/* は渡されたミドルウェアで返し、無ければ404のページにする", async () => {
    const withAssets = createServerApp({ template, assets: async (c, next) => c.req.path === "/assets/app.js" ? c.body("console.log(1)", 200, { "Content-Type": "text/javascript" }) : next() });
    expect(await (await withAssets.request("/assets/app.js")).text()).toBe("console.log(1)");
    const missing = await withAssets.request("/assets/missing.js");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("content-type")).toContain("text/html");
  });
});

describe("投稿した作品のページ", () => {
  const model = { id: "posted", name: "投稿した鶴", description: "", color: "#ed7070", procedure: { version: 2, size: 100, steps: [], history: [], finalBoards: [{ polygon: [[-50, -50, 0], [50, -50, 0], [50, 50, 0], [-50, 50, 0]], layer: 0 }] } };
  it("手順から描いた完成形の画像を og:image に使う", async () => {
    const repository = createMemoryOrigamiRepository([{ editKeyHash: "hash_user_a", model }]);
    const app = createServerApp({ template, origin: "https://oricube.example", repository });
    const res = await app.request("/view/posted");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`<meta property="og:image" content="https://oricube.example/api/models/posted/thumbnail.png" />`);
    expect((await app.request("/api/models/posted/thumbnail.png")).headers.get("content-type")).toBe("image/png");
  });
});

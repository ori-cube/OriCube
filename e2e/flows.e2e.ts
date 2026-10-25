import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Page } from "playwright";
import { api, launchBrowser, origin, signInAs, type Browser } from "./browser";

// apps/web/src/features/post-editor/draft.ts の DRAFT_KEY
const DRAFT_KEY = "oricube.v2.crane-draft";

let browser: Browser;
beforeAll(async () => { browser = await launchBrowser(); });
afterAll(async () => { await browser?.close(); });

/** 折りかけの下書き（鶴の手順）をブラウザに置いてから作成画面を開く。折る操作そのものは単体テストで確かめる */
const openWithDraft = async (page: Page, name: string) => {
  const { id: _id, ...crane } = await (await api("/api/models/crane")).json();
  await page.goto(`${origin()}/post`);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [DRAFT_KEY, JSON.stringify({ ...crane, name, editorViewFront: true })]);
  await page.reload();
  await page.getByText("前回の続きから再開しました。").waitFor();
};
const openPublish = async (page: Page, button = "投稿へ進む") => {
  await page.getByRole("button", { name: "作品の設定" }).click();
  await page.getByRole("button", { name: button }).click();
};
const capture = async (page: Page) => {
  await page.getByRole("button", { name: "この向きで撮影" }).click();
  await page.getByRole("img", { name: "撮影したサムネイル" }).waitFor();
};

describe("下書き（#100 の完了条件）", () => {
  it("未ログインで作成・下書き保存・再開ができ、ログインのために他のページへ移っても下書きが戻る", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openWithDraft(page, "未ログインの鶴");
    await expect(page.getByRole("status").first().textContent()).resolves.toContain("15回の折りを記録");
    // ログイン（外部の認証サービス）へ移って戻ってきた状態を、別のページを経由して再現する
    await page.goto("about:blank");
    await page.goto(`${origin()}/post`);
    await page.getByText("前回の続きから再開しました。").waitFor();
    await expect(page.getByRole("heading", { level: 1 }).textContent()).resolves.toBe("未ログインの鶴");
    // ログインしていなければ、投稿はサーバーに拒否され、下書きは残る
    await openPublish(page);
    await capture(page);
    await page.getByRole("button", { name: "投稿する" }).click();
    await expect(page.getByRole("alert").textContent()).resolves.toContain("折った手順はこのブラウザに保存されています");
    await context.close();
  });
});

describe("投稿・閲覧・再編集・削除", () => {
  it("ログインして投稿し、作品ページ・一覧・自分の作品に出る。再編集で同じURLを上書きし、削除すると見られなくなる", async () => {
    const context = await browser.newContext();
    await signInAs(context, "e2e_author");
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await openWithDraft(page, "E2Eの鶴");
    await openPublish(page);
    await capture(page);
    await page.getByRole("textbox", { name: "説明" }).fill("E2Eで投稿した鶴です。");
    await page.getByRole("button", { name: "投稿する" }).click();
    await page.getByRole("heading", { name: "投稿しました" }).waitFor();
    const href = await page.getByRole("link", { name: "作品ページを見る" }).getAttribute("href");
    const id = href?.replace("/view/", "") ?? "";
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    // 作品ページ: HTML に作品名・説明・サムネイルの OGP が入る
    const html = await (await fetch(`${origin()}/view/${id}`)).text();
    expect(html).toContain("<title>E2Eの鶴の折り方 | OriCube</title>");
    expect(html).toContain(`<meta property="og:description" content="E2Eで投稿した鶴です。" />`);
    expect(html).toMatch(new RegExp(`<meta property="og:image" content="[^"]*/thumbnails/${id}/`));
    await page.goto(`${origin()}/view/${id}`);
    await page.getByRole("heading", { name: "E2Eの鶴" }).waitFor();

    // 作品一覧にサムネイルの画像付きで出る
    await page.goto(`${origin()}/?q=E2E`);
    const card = page.getByRole("link", { name: /E2Eの鶴/ });
    await card.waitFor();
    expect(await card.locator("img").getAttribute("src")).toContain(`/thumbnails/${id}/`);

    // 自分の作品から再編集し、同じURLのまま上書きする
    await page.goto(`${origin()}/me`);
    // 折りかけの下書き（投稿した鶴）が残っているので、置き換えてよいか確かめられる
    const confirmed: string[] = [];
    page.once("dialog", (dialog) => { confirmed.push(dialog.message()); void dialog.accept(); });
    await page.getByRole("article", { name: "E2Eの鶴" }).getByRole("link", { name: "編集する" }).click();
    await page.getByText("「E2Eの鶴」を編集しています。").waitFor();
    expect(confirmed).toEqual(["今の下書きを消して「E2Eの鶴」を編集しますか？"]);
    await openPublish(page, "更新へ進む");
    await page.getByRole("textbox", { name: /作品名/ }).fill("直したE2Eの鶴");
    await page.getByRole("button", { name: "更新する" }).click();
    await page.getByRole("heading", { name: "更新しました" }).waitFor();
    expect(await (await api(`/api/models/${id}`)).json()).toMatchObject({ id, name: "直したE2Eの鶴" });

    // 他の人の「自分の作品」には出ない
    const other = await browser.newContext();
    await signInAs(other, "e2e_reader");
    const otherPage = await other.newPage();
    await otherPage.goto(`${origin()}/me`);
    await otherPage.getByText("まだ投稿した作品がありません。").waitFor();
    await other.close();

    // 確認してから削除すると、作品ページは404になる
    await page.goto(`${origin()}/me`);
    await page.getByRole("article", { name: "直したE2Eの鶴" }).getByRole("button", { name: "削除する" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click();
    await page.getByText(/「直したE2Eの鶴」を削除しました。/).waitFor();
    expect((await fetch(`${origin()}/view/${id}`)).status).toBe(404);
    const response = await page.goto(`${origin()}/view/${id}`);
    expect(response?.status()).toBe(404);

    expect(errors).toEqual([]);
    await context.close();
  });

  it("URL を直接開いて表示でき、存在しない作品は HTTP 404 になる（#100 の完了条件）", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    expect((await page.goto(`${origin()}/view/crane`))?.status()).toBe(200);
    await page.getByRole("heading", { name: "鶴" }).waitFor();
    expect((await page.goto(`${origin()}/view/does-not-exist`))?.status()).toBe(404);
    await page.getByText(/見つかりません/).first().waitFor();
    await context.close();
  });
});

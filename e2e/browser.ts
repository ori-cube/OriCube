import { chromium, type Browser, type BrowserContext } from "playwright";
import { inject } from "vitest";

/**
 * Chromium を起動する
 *
 * @description
 * E2E_CHROMIUM_PATH があればそのブラウザを使う（CI はランナーの Google Chrome、Playwright のブラウザを取得しない）。
 * WebGL（サムネイルの撮影）はソフトウェア描画（SwiftShader）で動かす
 */
export const launchBrowser = () => chromium.launch({
  ...(process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

export const origin = () => inject("origin");

/** ブラウザのコンテキストを、指定したユーザーでログインした状態（E2E 用の Cookie）にする */
export const signInAs = async (context: BrowserContext, userId: string) => {
  await context.addCookies([{ name: "e2e_user", value: userId, url: origin() }]);
};

/** fetch で API を呼ぶ。ブラウザと同じく、同一オリジンの書き込みには Origin を付ける */
export const api = (pathname: string, { user, method = "GET", body }: { user?: string; method?: string; body?: unknown } = {}) =>
  fetch(origin() + pathname, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin(), ...(user ? { Cookie: `e2e_user=${user}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export type { Browser };

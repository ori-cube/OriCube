import { useEffect, useRef } from "react";
import styles from "./index.module.css";

/** Turnstile のスクリプトが window に置く API のうち、使う操作だけを型にする */
interface TurnstileApi {
  render(container: HTMLElement, options: {
    sitekey: string;
    language?: string;
    size?: "normal" | "flexible" | "compact";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | undefined;

/** スクリプトはページで1回だけ読む。失敗したら次に表示したときに読み直す */
const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile を読み込めませんでした"));
    script.onerror = () => reject(new Error("Turnstile を読み込めませんでした"));
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
};

export interface TurnstileProps {
  siteKey: string;
  /** 確認できたらトークン、期限切れ・失敗なら null */
  onToken: (token: string | null) => void;
  /** 読み込みに失敗したとき */
  onLoadError: () => void;
}

/**
 * Cloudflare Turnstile の確認（bot でないことの確認）
 *
 * @description
 * ログインの代わりに、投稿の前に人であることを確かめる。ほとんどの人は操作なしで通る。
 * トークンは1回しか使えないため、使ったあとは key を変えて作り直す
 */
export function Turnstile({ siteKey, onToken, onLoadError }: TurnstileProps) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onToken, onLoadError });
  callbacks.current = { onToken, onLoadError };
  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    loadTurnstile().then((turnstile) => {
      if (cancelled || !container.current) return;
      widgetId = turnstile.render(container.current, {
        sitekey: siteKey,
        language: "ja",
        size: "flexible",
        callback: (token) => callbacks.current.onToken(token),
        "expired-callback": () => callbacks.current.onToken(null),
        "error-callback": () => callbacks.current.onToken(null),
      });
    }, () => { if (!cancelled) callbacks.current.onLoadError(); });
    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);
  return <div ref={container} className={styles.turnstile} />;
}

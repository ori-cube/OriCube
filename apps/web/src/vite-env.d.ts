/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloudflare Turnstile のサイトキー。未設定なら確認のウィジェットを出さない（本番の API は投稿を拒否する） */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

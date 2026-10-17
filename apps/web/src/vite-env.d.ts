/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk の Publishable Key。未設定ならログインできない（閲覧と下書きは使える） */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}

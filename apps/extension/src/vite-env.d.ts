/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  /** Comma-separated origins where the GolemGuard web app runs (localStorage session sync). */
  readonly VITE_WEB_APP_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

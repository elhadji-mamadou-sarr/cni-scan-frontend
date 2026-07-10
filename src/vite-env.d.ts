/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API backend FastAPI (ex: http://127.0.0.1:8000). */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

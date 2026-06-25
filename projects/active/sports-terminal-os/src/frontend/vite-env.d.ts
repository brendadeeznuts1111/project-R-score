/// <reference types="vite/client" />
/// <reference types="vite-plugin-react/client" />

/**
 * Vite environment type declarations.
 *
 * Provides type definitions for:
 *   - Vite's client-side env variables (import.meta.env)
 *   - HMR API (import.meta.hot)
 *   - Static asset imports (*.css, *.svg, etc.)
 */

interface ImportMetaEnv {
  /** Application version from package.json */
  readonly VITE_APP_VERSION: string;
  /** API base URL (defaults to /api) */
  readonly VITE_API_BASE: string;
  /** WebSocket URL (defaults to ws://host/ws) */
  readonly VITE_WS_URL: string;
  /** SSE endpoint URL */
  readonly VITE_SSE_URL: string;
  /** Current environment mode */
  readonly MODE: string;
  /** Whether in development mode */
  readonly DEV: boolean;
  /** Whether in production mode */
  readonly PROD: boolean;
  /** Whether running SSR build */
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot?: {
    accept: () => void;
    dispose: (callback: () => void) => void;
    invalidate: () => void;
  };
}

// @see https://bun.com/docs/runtime/http/server#reference — Server
// @see https://bun.com/docs/runtime/http/error-handling — development + error callback
/**
 * Bun.serve `error` wiring for serve-public.
 *
 * When `development: true`, omit a custom `error` handler so Bun keeps its
 * in-browser error page. When development is off, return JSON 500 (API-safe).
 */
import type { BunServeOptions } from './bun-server.ts';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
} as const;

/** Prod-like unhandled error body — no stack in the HTTP response. */
// eslint-disable-next-line harness/no-unknown-function-param -- Bun.serve error wire edge
export function servePublicErrorResponse(_error: unknown): Response {
  return Response.json(
    { error: 'Internal Server Error' },
    {
      status: 500,
      headers: JSON_HEADERS,
    }
  );
}

/**
 * Bun.serve `error` callback: log + JSON 500.
 * Prefer attaching via {@link attachServePublicErrorHandler} so development
 * mode keeps Bun's built-in page.
 */
// eslint-disable-next-line harness/no-unknown-function-param -- Bun.serve error wire edge
export function servePublicErrorHandler(error: unknown): Response {
  console.error('[serve] unhandled:', error);
  return servePublicErrorResponse(error);
}

export type AttachServePublicErrorOptions = {
  development: boolean;
};

/**
 * Attach `error` only when `!development`. Returning a Response from `error`
 * replaces Bun's default development error page.
 */
export function attachServePublicErrorHandler<T extends BunServeOptions>(
  opts: T,
  { development }: AttachServePublicErrorOptions
): T {
  if (development) {
    const { error: _drop, ...rest } = opts as T & { error?: unknown };
    return rest as T;
  }
  return {
    ...opts,
    error: servePublicErrorHandler,
  };
}

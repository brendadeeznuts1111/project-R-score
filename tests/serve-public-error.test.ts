// @see https://bun.com/docs/runtime/http/error-handling
import { describe, expect, test } from 'bun:test';
import {
  attachServePublicErrorHandler,
  servePublicErrorHandler,
  servePublicErrorResponse,
} from '../lib/http/serve-public-error.ts';
import type { BunServeOptions } from '../lib/http/bun-server.ts';

describe('serve-public error handler', () => {
  test('servePublicErrorResponse is JSON 500 without stack', async () => {
    const res = servePublicErrorResponse(new Error('secret boom'));
    expect(res.status).toBe(500);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: 'Internal Server Error' });
    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('message');
  });

  test('attachServePublicErrorHandler omits error when development', () => {
    const base = {
      fetch() {
        return new Response('ok');
      },
      error: servePublicErrorHandler,
    } as BunServeOptions;
    const attached = attachServePublicErrorHandler(base, { development: true });
    expect(attached.error).toBeUndefined();
    expect(typeof attached.fetch).toBe('function');
  });

  test('attachServePublicErrorHandler sets JSON error when !development', async () => {
    const base = {
      fetch() {
        return new Response('ok');
      },
    } as BunServeOptions;
    const attached = attachServePublicErrorHandler(base, { development: false });
    expect(typeof attached.error).toBe('function');
    const prev = console.error;
    console.error = () => {};
    try {
      const res = attached.error!(new Error('woops'));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Internal Server Error' });
    } finally {
      console.error = prev;
    }
  });
});

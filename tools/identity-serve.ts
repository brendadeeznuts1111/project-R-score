#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/http/server — Bun.serve
/**
 * Identity auth service — boots the identity subsystem over HTTP.
 *
 *   bun run identity:serve                 # IDENTITY_PORT or 3100
 *   IDENTITY_PORT=3101 bun tools/identity-serve.ts
 *
 * Routes:
 *   /auth/*     → createIdentityHandler (login/logout/session/export/impersonate/
 *                 me/* self-service incl. TOTP + passkeys)
 *   GET /health → { ok, aliases, uptimeSeconds } (no secrets)
 *
 * Requires seeded data: bun tools/identity-admin.ts seed-demo
 */
import { IdentitySystem } from '../lib/identity/identity.ts';
import { createIdentityHandler } from '../lib/identity/http.ts';
import { collectBoardData } from '../lib/identity/board.ts';

const PORT = Number(Bun.env.IDENTITY_PORT ?? 3100);
const DB_PATH = Bun.env.IDENTITY_DB ?? 'data/accounts-operations.db';

export function createIdentityServer(port = PORT, dbPath = DB_PATH) {
  const identity = new IdentitySystem(undefined, dbPath);
  const handler = createIdentityHandler(identity);
  const started = Date.now();

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/health') {
        const board = collectBoardData(dbPath);
        return Response.json({
          ok: true,
          aliases: board.empty ? 0 : board.counts.aliases,
          uptimeSeconds: Math.floor((Date.now() - started) / 1000),
        });
      }
      const res = await handler(req);
      return (
        res ??
        new Response(JSON.stringify({ error: 'not_found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        })
      );
    },
  });

  return { server, identity, port: server.port };
}

if (import.meta.main) {
  const { server, port } = createIdentityServer();
  console.log(`identity:serve listening on http://127.0.0.1:${port} (db: ${DB_PATH})`);
  console.log('  POST /auth/login · GET /health · Ctrl-C to stop');
  process.on('SIGINT', () => {
    server.stop();
    process.exit(0);
  });
}

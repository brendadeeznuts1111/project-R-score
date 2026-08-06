#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/websockets — WebSocket server
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Standalone agent-odds desk (v1.07).
 *
 * Prefer portal one-process mode:
 *   bun run serve:public  →  /portal/agent-odds/ + same-origin APIs + /ws
 *
 * Standalone:
 *   bun run agent:odds-dashboard
 *   open http://127.0.0.1:3000/
 */
import {
  agentOddsWebSocketHandlers,
  handleAgentOddsRequest,
  startAgentOddsBroadcast,
  stopAgentOddsBroadcast,
} from '../lib/operator-research/agent-odds-http.ts';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const DASH_DIR = joinPath(ROOT, 'public/portal/agent-odds');
const PORT = Number(Bun.env.PORT || Bun.env.AGENT_ODDS_PORT || 3000);
const HOST = Bun.env.HOST || '127.0.0.1';

function contentType(path: string): string {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req, srv) {
    const handled = await handleAgentOddsRequest(req, srv);
    if (handled !== null) return handled;

    const url = new URL(req.url);
    let filePath =
      url.pathname === '/' || url.pathname === '' ? '/dashboard-v1.07.html' : url.pathname;
    if (filePath === '/index.html') filePath = '/dashboard-v1.07.html';
    const safe = filePath.replace(/\.\./g, '').replace(/^\/+/, '');
    const abs = joinPath(DASH_DIR, safe || 'dashboard-v1.07.html');
    if (!abs.startsWith(DASH_DIR)) return new Response('Forbidden', { status: 403 });
    const file = Bun.file(abs);
    if (await file.exists()) {
      return new Response(file, {
        headers: { 'Content-Type': contentType(abs), 'Cache-Control': 'no-store' },
      });
    }
    return new Response('Not found', { status: 404 });
  },
  websocket: agentOddsWebSocketHandlers(),
});

startAgentOddsBroadcast(server);

process.on('SIGINT', () => {
  stopAgentOddsBroadcast();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopAgentOddsBroadcast();
  process.exit(0);
});

console.log(
  `agent-odds standalone v1.07 → http://${server.hostname}:${server.port}/  (prefer: bun run serve:public for portal+desk)`
);

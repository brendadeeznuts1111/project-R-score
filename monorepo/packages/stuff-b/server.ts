import { createUserService, bulkValidate } from './index';
import { createDB } from './db';
import { withCors, corsPreflightResponse, withTiming, getRequestLogs, checkAuth } from './middleware';
import {
  DB, DEFAULT_PORT, DEFAULT_HOSTNAME, ROUTES, LIMITS,
  AUTH, FEATURES, serverUrl, wsUrl, userByIdRoute,
} from 'stuff-a/config';

const db = createDB(DB.DEFAULT_PATH);
const svc = createUserService();

// Sync in-memory service from DB on startup
for (const user of db.list(LIMITS.MAX_SEED_COUNT)) {
  svc.create(user);
}

const clients = new Set<{ send(data: string): void }>();

function broadcast(event: string, data: unknown) {
  const msg = JSON.stringify({ event, data, ts: Date.now() });
  for (const ws of clients) {
    ws.send(msg);
  }
}

export default Bun.serve({
  port: DEFAULT_PORT,
  hostname: DEFAULT_HOSTNAME,
  routes: {
    [ROUTES.USERS]: {
      GET: (req) => withTiming(
        () => Response.json(svc.list()),
        'GET', ROUTES.USERS,
      ),
      POST: (req) => withTiming(async () => {
        if (!await checkAuth(req)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
          const body = await req.json();
          const user = svc.create(body);
          db.insert(user);
          broadcast('user:created', user);
          return Response.json(user, { status: 201 });
        } catch (e) {
          return Response.json({ error: String(e) }, { status: 400 });
        }
      }, 'POST', ROUTES.USERS),
      OPTIONS: () => corsPreflightResponse(),
    },
    '/users/bulk': {
      POST: (req) => withTiming(async () => {
        if (!await checkAuth(req)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await req.json();
        if (!Array.isArray(body)) {
          return Response.json({ error: 'Expected array' }, { status: 400 });
        }
        const result = bulkValidate(body);
        const inserted = db.insertMany(result.valid);
        for (const user of result.valid) svc.create(user);
        broadcast('users:bulk', { created: inserted, errors: result.errors });
        return Response.json({ created: result.valid.length, errors: result.errors });
      }, 'POST', '/users/bulk'),
      OPTIONS: () => corsPreflightResponse(),
    },
    '/users/:id': {
      GET: (req) => withTiming(
        () => {
          const user = db.get(req.params.id);
          if (!user) return Response.json({ error: 'Not found' }, { status: 404 });
          return Response.json(user);
        },
        'GET', userByIdRoute(req.params.id),
      ),
      DELETE: (req) => withTiming(async () => {
        if (!await checkAuth(req)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const deleted = db.delete(req.params.id);
        if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });
        broadcast('user:deleted', { id: req.params.id });
        return Response.json({ deleted: true });
      }, 'DELETE', userByIdRoute(req.params.id)),
      OPTIONS: () => corsPreflightResponse(),
    },
    [ROUTES.METRICS]: (req) => withTiming(
      () => {
        if (!FEATURES.ENABLE_METRICS) {
          return Response.json({ error: 'Metrics disabled' }, { status: 404 });
        }
        return Response.json({ ...db.stats(), logs: getRequestLogs() });
      },
      'GET', ROUTES.METRICS,
    ),
    [ROUTES.WS]: (req, server) => {
      if (server.upgrade(req)) return undefined;
      return new Response('WebSocket upgrade failed', { status: 400 });
    },
    [ROUTES.HEALTH]: new Response('ok'),
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      ws.send(JSON.stringify({ event: 'connected', data: { users: db.count() }, ts: Date.now() }));
    },
    message(_ws, _msg) {
      // clients are read-only subscribers
    },
    close(ws) {
      clients.delete(ws);
    },
  },
});

console.log(`stuff-b server listening on ${serverUrl()}`);
console.log(`  WebSocket: ${wsUrl()}${ROUTES.WS}`);
console.log(`  Database: ${DB.DEFAULT_PATH}`);
console.log(`  Auth: ${AUTH.API_TOKEN ? 'enabled' : 'open'}`);

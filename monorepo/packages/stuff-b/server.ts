import { createUserService, bulkValidate } from './index';
import { createDB } from './db';
import { withCors, corsPreflightResponse, withTiming, getRequestLogs, checkAuth, withRateLimit } from './middleware';
import { getRateLimitMetrics } from './rate-limit';
import { logger, getLogFileInfo } from './logger';
import { Errors, errorResponse } from 'stuff-a/errors';
import { parseQuery } from 'stuff-a/query';
import { UserUpdateSchema, BulkUpdateItemSchema } from 'stuff-a/update';
import {
  DB, DEFAULT_PORT, DEFAULT_HOSTNAME, ROUTES, LIMITS,
  AUTH, FEATURES, CONFIG_PATH, serverUrl, wsUrl, userByIdRoute,
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

const server = Bun.serve({
  port: DEFAULT_PORT,
  hostname: DEFAULT_HOSTNAME,
  routes: {
    [ROUTES.USERS]: {
      GET: (req) => withTiming(() => {
        try {
          const url = new URL(req.url);
          const query = parseQuery(url.searchParams);
          const users = db.search(query);
          const total = db.countFiltered(query);
          return Response.json({ users, total, limit: query.limit, offset: query.offset });
        } catch (e) {
          return errorResponse(Errors.badRequest(String(e)));
        }
      }, 'GET', ROUTES.USERS),
      POST: (req) => withTiming(async () => {
        const rateLimited = withRateLimit(req);
        if (rateLimited) return rateLimited;
        if (!await checkAuth(req)) {
          return errorResponse(Errors.unauthorized());
        }
        try {
          const body = await req.json();
          const user = svc.create(body);
          db.insert(user);
          broadcast('user:created', user);
          return Response.json(user, { status: 201 });
        } catch (e) {
          return errorResponse(Errors.badRequest(String(e)));
        }
      }, 'POST', ROUTES.USERS),
      OPTIONS: () => corsPreflightResponse(),
    },
    '/users/bulk': {
      POST: (req) => withTiming(async () => {
        const rateLimited = withRateLimit(req);
        if (rateLimited) return rateLimited;
        if (!await checkAuth(req)) {
          return errorResponse(Errors.unauthorized());
        }
        const body = await req.json();
        if (!Array.isArray(body)) {
          return errorResponse(Errors.badRequest('Expected array'));
        }
        const result = bulkValidate(body);
        const inserted = db.insertMany(result.valid);
        for (const user of result.valid) svc.create(user);
        broadcast('users:bulk', { created: inserted, errors: result.errors });
        return Response.json({ created: result.valid.length, errors: result.errors });
      }, 'POST', '/users/bulk'),
      PATCH: (req) => withTiming(async () => {
        const rateLimited = withRateLimit(req);
        if (rateLimited) return rateLimited;
        if (!await checkAuth(req)) {
          return errorResponse(Errors.unauthorized());
        }
        try {
          const body = await req.json();
          if (!Array.isArray(body)) {
            return errorResponse(Errors.badRequest('Expected array'));
          }
          const items = body.map((item: unknown) => BulkUpdateItemSchema.parse(item));
          const result = db.updateMany(items);
          broadcast('users:bulk-updated', result);
          return Response.json(result);
        } catch (e) {
          return errorResponse(Errors.badRequest(String(e)));
        }
      }, 'PATCH', '/users/bulk'),
      OPTIONS: () => corsPreflightResponse(),
    },
    '/users/:id': {
      GET: (req) => withTiming(
        () => {
          const user = db.get(req.params.id);
          if (!user) return errorResponse(Errors.notFound());
          return Response.json(user);
        },
        'GET', userByIdRoute(req.params.id),
      ),
      PATCH: (req) => withTiming(async () => {
        const rateLimited = withRateLimit(req);
        if (rateLimited) return rateLimited;
        if (!await checkAuth(req)) {
          return errorResponse(Errors.unauthorized());
        }
        try {
          const body = await req.json();
          const changes = UserUpdateSchema.parse(body);
          const updated = db.update(req.params.id, changes);
          if (!updated) return errorResponse(Errors.notFound());
          broadcast('user:updated', updated);
          return Response.json(updated);
        } catch (e) {
          return errorResponse(Errors.badRequest(String(e)));
        }
      }, 'PATCH', userByIdRoute(req.params.id)),
      DELETE: (req) => withTiming(async () => {
        const rateLimited = withRateLimit(req);
        if (rateLimited) return rateLimited;
        if (!await checkAuth(req)) {
          return errorResponse(Errors.unauthorized());
        }
        const deleted = db.delete(req.params.id);
        if (!deleted) return errorResponse(Errors.notFound());
        broadcast('user:deleted', { id: req.params.id });
        return Response.json({ deleted: true });
      }, 'DELETE', userByIdRoute(req.params.id)),
      OPTIONS: () => corsPreflightResponse(),
    },
    [ROUTES.METRICS]: (req) => withTiming(
      () => {
        if (!FEATURES.ENABLE_METRICS) {
          return errorResponse(Errors.notFound('Metrics disabled'));
        }
        const dbFile = Bun.file(DB.DEFAULT_PATH);
        return Response.json({
          ...db.stats(),
          dbFileSize: dbFile.size,
          dbFileType: dbFile.type,
          logs: getRequestLogs(),
          rateLimit: getRateLimitMetrics(),
          logFile: getLogFileInfo(),
        });
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

// Graceful shutdown
function shutdown() {
  server.stop();
  db.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('Server started', { url: serverUrl() });
logger.info('WebSocket available', { url: `${wsUrl()}${ROUTES.WS}` });
logger.info('Database configured', { path: DB.DEFAULT_PATH });
logger.info('Auth mode', { mode: AUTH.API_TOKEN ? 'enabled' : 'open' });
logger.info('Config source', { path: CONFIG_PATH });

export default server;

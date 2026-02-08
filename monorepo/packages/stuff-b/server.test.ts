import { test, expect, afterAll } from 'bun:test';
import { createUserService, bulkValidate } from './index';
import { createDB } from './db';
import { withCors, corsPreflightResponse, withTiming, getRequestLogs, withRateLimit } from './middleware';
import { Errors, errorResponse } from 'stuff-a/errors';
import { parseQuery } from 'stuff-a/query';
import { UserUpdateSchema } from 'stuff-a/update';
import {
  DEFAULT_TEST_PORT, ROUTES, LIMITS, HEADERS,
  serverUrl, wsUrl, userByIdRoute,
} from 'stuff-a/config';

const BASE = serverUrl(DEFAULT_TEST_PORT);
let server: ReturnType<typeof Bun.serve>;

// Inline server for testing on a different port
const db = createDB(':memory:');
const svc = createUserService();

const clients = new Set<{ send(data: string): void }>();

server = Bun.serve({
  port: DEFAULT_TEST_PORT,
  routes: {
    [ROUTES.USERS]: {
      GET: (req) => withTiming(() => {
        const url = new URL(req.url);
        const query = parseQuery(url.searchParams);
        return Response.json(db.search(query));
      }, 'GET', ROUTES.USERS),
      POST: (req) => withTiming(async () => {
        try {
          const body = await req.json();
          const user = svc.create(body);
          db.insert(user);
          return Response.json(user, { status: 201 });
        } catch (e) {
          return errorResponse(Errors.badRequest(String(e)));
        }
      }, 'POST', ROUTES.USERS),
      OPTIONS: () => corsPreflightResponse(),
    },
    '/users/bulk': {
      POST: (req) => withTiming(async () => {
        const body = await req.json();
        if (!Array.isArray(body)) {
          return errorResponse(Errors.badRequest('Expected array'));
        }
        const result = bulkValidate(body);
        db.insertMany(result.valid);
        for (const user of result.valid) svc.create(user);
        return Response.json({ created: result.valid.length, errors: result.errors });
      }, 'POST', '/users/bulk'),
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
        try {
          const body = await req.json();
          const changes = UserUpdateSchema.parse(body);
          const updated = db.update(req.params.id, changes);
          if (!updated) return errorResponse(Errors.notFound());
          return Response.json(updated);
        } catch (e) {
          return errorResponse(Errors.badRequest(String(e)));
        }
      }, 'PATCH', userByIdRoute(req.params.id)),
      DELETE: (req) => withTiming(() => {
        const deleted = db.delete(req.params.id);
        if (!deleted) return errorResponse(Errors.notFound());
        return Response.json({ deleted: true });
      }, 'DELETE', userByIdRoute(req.params.id)),
    },
    [ROUTES.METRICS]: (req) => withTiming(
      () => Response.json({ ...db.stats(), logs: getRequestLogs() }),
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
    message() {},
    close(ws) { clients.delete(ws); },
  },
});

afterAll(() => {
  server.stop();
  db.close();
});

const validUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: '2026-01-01',
};

test('GET /health', async () => {
  const res = await fetch(`${BASE}${ROUTES.HEALTH}`);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe('ok');
});

test('POST /users creates user', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}`, {
    method: 'POST',
    headers: HEADERS.JSON,
    body: JSON.stringify(validUser),
  });
  expect(res.status).toBe(201);
  const user = await res.json();
  expect(user.name).toBe('Alice');
});

test('GET /users lists users', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}`);
  const users = await res.json();
  expect(users.length).toBeGreaterThanOrEqual(1);
});

test('GET /users/:id returns user', async () => {
  const res = await fetch(`${BASE}${userByIdRoute(validUser.id)}`);
  expect(res.status).toBe(200);
  const user = await res.json();
  expect(user.name).toBe('Alice');
});

test('GET /users/:id returns 404 for missing', async () => {
  const res = await fetch(`${BASE}${userByIdRoute('nonexistent')}`);
  expect(res.status).toBe(404);
});

test('POST /users rejects invalid input', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}`, {
    method: 'POST',
    headers: HEADERS.JSON,
    body: JSON.stringify({ name: '' }),
  });
  expect(res.status).toBe(400);
});

test('POST /users/bulk validates batch', async () => {
  const res = await fetch(`${BASE}/users/bulk`, {
    method: 'POST',
    headers: HEADERS.JSON,
    body: JSON.stringify([
      { ...validUser, id: '660e8400-e29b-41d4-a716-446655440000', email: 'bob@test.com' },
      { ...validUser, id: 'bad', email: 'nope' },
    ]),
  });
  const result = await res.json();
  expect(result.created).toBe(1);
  expect(result.errors).toBe(1);
});

test('GET /metrics returns db stats and logs', async () => {
  const res = await fetch(`${BASE}${ROUTES.METRICS}`);
  expect(res.status).toBe(200);
  const metrics = await res.json();
  expect(metrics.count).toBeGreaterThanOrEqual(1);
  expect(metrics.sizeBytes).toBeGreaterThan(0);
  expect(Array.isArray(metrics.logs)).toBe(true);
});

test('responses include CORS headers', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}`);
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
});

test('responses include X-Response-Time header', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}`);
  const time = res.headers.get(HEADERS.RESPONSE_TIME);
  expect(time).toBeTruthy();
  expect(time).toContain('ms');
});

test('OPTIONS returns CORS preflight', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}`, { method: 'OPTIONS' });
  expect(res.status).toBe(204);
  expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  expect(res.headers.get('Access-Control-Allow-Methods')).toContain('PATCH');
});

test('DELETE /users/:id removes user', async () => {
  const res = await fetch(`${BASE}${userByIdRoute(validUser.id)}`, { method: 'DELETE' });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.deleted).toBe(true);

  // Verify gone
  const check = await fetch(`${BASE}${userByIdRoute(validUser.id)}`);
  expect(check.status).toBe(404);
});

test('WebSocket connects and receives welcome', async () => {
  const ws = new WebSocket(`${wsUrl(DEFAULT_TEST_PORT)}${ROUTES.WS}`);
  const msg = await new Promise<string>((resolve) => {
    ws.onmessage = (e) => resolve(e.data as string);
  });
  const parsed = JSON.parse(msg);
  expect(parsed.event).toBe('connected');
  expect(parsed.data.users).toBeGreaterThanOrEqual(0);
  ws.close();
});

// ── New tests: PATCH, search, structured errors ──

test('PATCH /users/:id updates user', async () => {
  // Re-create user for PATCH tests
  const res = await fetch(`${BASE}${ROUTES.USERS}`, {
    method: 'POST',
    headers: HEADERS.JSON,
    body: JSON.stringify({ ...validUser, email: 'alice-patch@example.com' }),
  });
  expect(res.status).toBe(201);

  const patchRes = await fetch(`${BASE}${userByIdRoute(validUser.id)}`, {
    method: 'PATCH',
    headers: HEADERS.JSON,
    body: JSON.stringify({ name: 'Alice Patched' }),
  });
  expect(patchRes.status).toBe(200);
  const updated = await patchRes.json();
  expect(updated.name).toBe('Alice Patched');
});

test('PATCH /users/:id returns 404 for missing user', async () => {
  const res = await fetch(`${BASE}${userByIdRoute('nonexistent-uuid')}`, {
    method: 'PATCH',
    headers: HEADERS.JSON,
    body: JSON.stringify({ name: 'Ghost' }),
  });
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body.code).toBe('NOT_FOUND');
});

test('PATCH /users/:id rejects empty body', async () => {
  const res = await fetch(`${BASE}${userByIdRoute(validUser.id)}`, {
    method: 'PATCH',
    headers: HEADERS.JSON,
    body: JSON.stringify({}),
  });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.code).toBe('BAD_REQUEST');
});

test('GET /users with search params filters results', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}?search=Alice`);
  const users = await res.json();
  expect(users.length).toBeGreaterThanOrEqual(1);
  expect(users.every((u: any) => u.name.includes('Alice'))).toBe(true);
});

test('GET /users with role param filters by role', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}?role=admin`);
  const users = await res.json();
  expect(users.every((u: any) => u.role === 'admin')).toBe(true);
});

test('GET /users with limit param limits results', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}?limit=1`);
  const users = await res.json();
  expect(users.length).toBeLessThanOrEqual(1);
});

test('structured error has code field', async () => {
  const res = await fetch(`${BASE}${userByIdRoute('does-not-exist')}`);
  expect(res.status).toBe(404);
  const body = await res.json();
  expect(body.code).toBe('NOT_FOUND');
  expect(body.error).toBe('Not found');
  expect(body.status).toBe(404);
});

test('POST /users 400 has structured error', async () => {
  const res = await fetch(`${BASE}${ROUTES.USERS}`, {
    method: 'POST',
    headers: HEADERS.JSON,
    body: JSON.stringify({ name: '' }),
  });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.code).toBe('BAD_REQUEST');
});

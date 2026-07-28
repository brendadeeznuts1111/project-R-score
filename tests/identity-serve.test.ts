// @see https://bun.com/docs/test — bun:test
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { AccountSystem } from '../lib/accounts/accounts.ts';
import { IdentitySystem } from '../lib/identity/identity.ts';
import { asTelegramUserId, asTreeNodeId } from '../lib/types/branded.ts';
import { createIdentityServer } from '../tools/identity-serve.ts';

describe('identity-serve (TCP)', () => {
  let dir: string;
  let server: ReturnType<typeof createIdentityServer>;
  let base: string;

  beforeAll(async () => {
    dir = mkdtempSync(`${tmpdir()}/identity-serve-test-`);
    const dbPath = `${dir}/accounts.db`;
    const accounts = new AccountSystem(undefined, dbPath);
    const node = await accounts.create({
      type: 'partner',
      parentId: null,
      expertId: null,
      name: 'Serve Test',
      telegramId: asTelegramUserId('tg:serve-test'),
      railPreference: 'paypal',
      cutPercentage: 0,
    });
    const identity = new IdentitySystem(undefined, dbPath);
    await identity.createAlias(node.id as ReturnType<typeof asTreeNodeId>, 'serve-test', 'correct horse battery staple', 'superadmin');
    identity.close();

    server = createIdentityServer(0, dbPath); // port 0 → ephemeral
    base = `http://127.0.0.1:${server.port}`;
  });

  afterAll(() => {
    server.server.stop(true);
    server.identity.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('GET /health reports ok + alias count', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.aliases).toBe(1);
  });

  test('POST /auth/login issues a token; GET /auth/session resolves it', async () => {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'serve-test', password: 'correct horse battery staple' }),
    });
    expect(login.status).toBe(200);
    const { token } = await login.json();
    expect(typeof token).toBe('string');

    const session = await fetch(`${base}/auth/session`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(session.status).toBe(200);
    const info = await session.json();
    expect(info.role).toBe('superadmin');
  });

  test('bad password is 401 without enumeration; unknown route is 404', async () => {
    const bad = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'serve-test', password: 'wrong' }),
    });
    expect(bad.status).toBe(401);

    const missing = await fetch(`${base}/nope`);
    expect(missing.status).toBe(404);
  });
});

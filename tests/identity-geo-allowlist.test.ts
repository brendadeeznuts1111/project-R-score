/**
 * Identity/auth subsystem — Phase 2b geo-policy: allowlist/off modes + HTTP 403.
 * Complements identity-geo-policy.test.ts (blocklist + offline-allow).
 * @see ../lib/identity/geo-policy.ts
 * @see ../lib/identity/http.ts
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isGeoBlocked } from '../lib/identity/geo-policy.ts';
import { createIdentityHandler } from '../lib/identity/http.ts';
import { GeoBlockedError, IdentitySystem } from '../lib/identity/identity.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

const PASSWORD = 'correct horse battery staple';
const IP = '203.0.113.7';

describe('identity-geo-allowlist', () => {
  let dir: string;
  let dbPath: string;
  let nodeId: TreeNodeId;

  function seedTreeNode(id: TreeNodeId): void {
    const db = new Database(dbPath);
    db.run(`
      CREATE TABLE IF NOT EXISTS tree_nodes (
        id TEXT PRIMARY KEY,
        type TEXT,
        name TEXT NOT NULL,
        telegram_id TEXT,
        created_at TEXT NOT NULL
      );
    `);
    db.query(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, created_at)
       VALUES ($id, 'agent', 'Test Agent', '111', $now)
       ON CONFLICT(id) DO NOTHING`
    ).run({ $id: id, $now: new Date().toISOString() });
    db.close();
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fw-identity-geo-allow-'));
    dbPath = join(dir, 'identity.db');
    nodeId = asTreeNodeId(Bun.randomUUIDv7());
    seedTreeNode(nodeId);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('isGeoBlocked: allowlist blocks unlisted, allows listed (case-insensitive)', () => {
    expect(isGeoBlocked({ mode: 'allowlist', countries: ['US'] }, 'DE')).toBe(true);
    expect(isGeoBlocked({ mode: 'allowlist', countries: ['us'] }, 'US')).toBe(false);
    expect(isGeoBlocked({ mode: 'off', countries: ['KP'] }, 'KP')).toBe(false);
  });

  test('allowlist blocks a non-listed country with GeoBlockedError, allows a listed one', async () => {
    let country: string | null = 'DE';
    const identity = new IdentitySystem(undefined, dbPath, {
      geoResolver: () => Promise.resolve(country),
      geoPolicy: { mode: 'allowlist', countries: ['US'] },
    });
    await identity.createAlias(nodeId, 'geo-agent', PASSWORD);
    try {
      const err = await identity.login('geo-agent', PASSWORD, { ip: IP }).catch(e => e);
      expect(err).toBeInstanceOf(GeoBlockedError);
      expect((err as GeoBlockedError).country).toBe('DE');

      const audit = identity.auditFor(nodeId, { action: 'login_blocked_geo' });
      expect(audit.length).toBe(1);
      expect(audit[0]!.success).toBe(false);

      country = 'US';
      const result = await identity.login('geo-agent', PASSWORD, { ip: IP });
      expect(identity.resolveSession(result.token)).not.toBeNull();
    } finally {
      identity.close();
    }
  });

  test("mode 'off' never blocks, even for a blocklisted-looking country", async () => {
    const identity = new IdentitySystem(undefined, dbPath, {
      geoResolver: () => Promise.resolve('KP'),
      geoPolicy: { mode: 'off', countries: ['KP'] },
    });
    await identity.createAlias(nodeId, 'geo-agent', PASSWORD);
    try {
      const result = await identity.login('geo-agent', PASSWORD, { ip: IP });
      expect(identity.resolveSession(result.token)).not.toBeNull();
      expect(identity.auditFor(nodeId, { action: 'login_blocked_geo' }).length).toBe(0);
    } finally {
      identity.close();
    }
  });

  test('HTTP: geo-blocked login maps to 403', async () => {
    const identity = new IdentitySystem(undefined, dbPath, {
      geoResolver: () => Promise.resolve('KP'),
      geoPolicy: { mode: 'blocklist', countries: ['KP'] },
    });
    await identity.createAlias(nodeId, 'geo-agent', PASSWORD);
    try {
      const handler = createIdentityHandler(identity);
      const res = await handler(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'cf-connecting-ip': IP },
          body: JSON.stringify({ slug: 'geo-agent', password: PASSWORD }),
        })
      );
      expect(res).not.toBeNull();
      expect(res!.status).toBe(403);
    } finally {
      identity.close();
    }
  });
});

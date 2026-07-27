import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isGeoBlocked } from '../lib/identity/geo-policy.ts';
import { GeoBlockedError, IdentitySystem } from '../lib/identity/identity.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

describe('identity-geo-policy', () => {
  test('isGeoBlocked blocklist semantics are case-insensitive', () => {
    expect(isGeoBlocked({ mode: 'blocklist', countries: ['kp'] }, 'KP')).toBe(true);
    expect(isGeoBlocked({ mode: 'blocklist', countries: ['US'] }, 'CA')).toBe(false);
    expect(isGeoBlocked({ mode: 'off', countries: ['US'] }, 'US')).toBe(false);
  });

  describe('login geo enforcement', () => {
    let dir: string;
    let dbPath: string;
    let identity: IdentitySystem;
    let nodeId: TreeNodeId;

    const PASSWORD = 'correct horse battery staple';
    const IP = '203.0.113.7';

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
         VALUES ($id, 'agent', 'Agent', $tg, $now)`
      ).run({ $id: id, $tg: `tg-${Bun.randomUUIDv7()}`, $now: new Date().toISOString() });
      db.close();
    }

    beforeEach(async () => {
      dir = mkdtempSync(join(tmpdir(), 'id-geo-'));
      dbPath = join(dir, 'accounts.db');
      nodeId = asTreeNodeId(Bun.randomUUIDv7());
      seedTreeNode(nodeId);

      identity = new IdentitySystem(undefined, dbPath, {
        geoPolicy: { mode: 'blocklist', countries: ['KP'] },
        geoResolver: async ip => (ip === IP ? 'KP' : 'US'),
      });
      await identity.createAlias(nodeId, 'geo-agent', PASSWORD);
    });

    afterEach(() => {
      identity.close();
      rmSync(dir, { recursive: true, force: true });
    });

    test('blocked country audits login_blocked_geo before password verify', async () => {
      await expect(identity.login('geo-agent', PASSWORD, { ip: IP })).rejects.toThrow(
        GeoBlockedError
      );
      const audit = identity.auditFor(nodeId, { action: 'login_blocked_geo', limit: 1 });
      expect(audit[0]?.action).toBe('login_blocked_geo');
    });

    test('missing ip offline-allows login', async () => {
      const { token } = await identity.login('geo-agent', PASSWORD);
      expect(token).toBeDefined();
    });

    test('resolver null offline-allows login', async () => {
      const offline = new IdentitySystem(undefined, dbPath, {
        geoPolicy: { mode: 'blocklist', countries: ['KP'] },
        geoResolver: async () => null,
      });
      try {
        const { token } = await offline.login('geo-agent', PASSWORD, { ip: IP });
        expect(token).toBeDefined();
      } finally {
        offline.close();
      }
    });
  });
});

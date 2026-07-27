// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Partner isolation — vault HKDF separation + agent prefix auth.
 *
 * Run:
 *   bun test tests/partner-isolation.test.ts
 *   bun test --parallel --shard=1/3 tests/partner-isolation.test.ts
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  setPartnerSecret,
  getPartnerSecret,
} from '../lib/security/partner-vault.ts';
import {
  AGENT_API_KEY_PREFIX,
  createAgent,
  verifyAgent,
} from '../lib/security/ai-agents.ts';

const MASTER = 'partner-isolation-test-master-key';

describe('partner isolation', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE tree_nodes (id TEXT PRIMARY KEY);
      CREATE TABLE partner_vault (
        id INTEGER PRIMARY KEY,
        node_id TEXT NOT NULL,
        key TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        key_version INTEGER NOT NULL,
        UNIQUE(node_id, key)
      );
      CREATE TABLE ai_agents (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        name TEXT NOT NULL,
        api_key_hash TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        scope TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX idx_ai_agents_key_prefix ON ai_agents(key_prefix);
      INSERT INTO tree_nodes VALUES ('node-a'), ('node-b');
    `);
  });

  test('vault keys are cryptographically isolated', async () => {
    await setPartnerSecret(db, 'node-a', 'k', 'secret-a', { masterKey: MASTER });
    await setPartnerSecret(db, 'node-b', 'k', 'secret-b', { masterKey: MASTER });

    // Same key name, different ciphertext due to HKDF (and per-encrypt IV)
    const rows = db
      .query('SELECT node_id, encrypted_value FROM partner_vault ORDER BY node_id')
      .all() as { node_id: string; encrypted_value: string }[]; // brand-ok — raw sqlite projection
    expect(rows).toHaveLength(2);
    expect(rows[0]!.encrypted_value).not.toBe(rows[1]!.encrypted_value);

    // Round-trip decrypt is node-scoped
    expect(await getPartnerSecret(db, 'node-a', 'k', { masterKey: MASTER })).toBe('secret-a');
    expect(await getPartnerSecret(db, 'node-b', 'k', { masterKey: MASTER })).toBe('secret-b');
  });

  test('same plaintext across partners still differs (HKDF)', async () => {
    await setPartnerSecret(db, 'node-a', 'k', 'same-plain', { masterKey: MASTER });
    await setPartnerSecret(db, 'node-b', 'k', 'same-plain', { masterKey: MASTER });
    const rows = db
      .query('SELECT encrypted_value FROM partner_vault ORDER BY node_id')
      .all() as { encrypted_value: string }[];
    expect(rows[0]!.encrypted_value).not.toBe(rows[1]!.encrypted_value);
  });

  test('agent prefix lookup is exact', async () => {
    const { apiKey } = await createAgent(db, 'node-a', 'bot');
    expect(apiKey.startsWith(AGENT_API_KEY_PREFIX)).toBe(true);
    const prefix = apiKey.slice(9, 17); // after pk_agent_

    const rows = db
      .query('SELECT COUNT(*) as n FROM ai_agents WHERE key_prefix = ?')
      .get(prefix) as { n: number };
    expect(rows.n).toBe(1);

    // Active key authenticates
    const agent = await verifyAgent(db, apiKey);
    expect(agent).not.toBeNull();
    expect(agent!.name).toBe('bot');
    expect(agent!.nodeId).toBe('node-a');
  });

  test('revoked agent fails auth', async () => {
    const { apiKey } = await createAgent(db, 'node-a', 'bot');
    db.run("UPDATE ai_agents SET status = 'revoked' WHERE node_id = ?", ['node-a']);
    expect(await verifyAgent(db, apiKey)).toBeNull();
  });
});

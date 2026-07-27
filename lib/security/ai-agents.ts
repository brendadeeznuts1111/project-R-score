// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * AI agent API keys — mint, exact prefix lookup, verify, revoke.
 *
 * Wire format: `pk_agent_` + hex material.
 * Lookup uses an exact 8-char `key_prefix` (chars after the fixed prefix),
 * then Argon2id verifies the full key. Revoked agents never authenticate.
 *
 * Repository layer: SQL filters on `node_id` / `key_prefix` belong here.
 */
import type { Database } from 'bun:sqlite';
import { asTreeNodeId, type TreeNodeId } from '../types/branded.ts';

/** Fixed public prefix for agent API keys (`pk_agent_` — length 9). */
export const AGENT_API_KEY_PREFIX = 'pk_agent_';
/** Exact lookup window after {@link AGENT_API_KEY_PREFIX}. */
export const AGENT_KEY_PREFIX_LEN = 8;

export type AgentStatus = 'active' | 'revoked';

export type AgentRecord = {
  id: string; // brand-ok — opaque agent primary key
  nodeId: TreeNodeId;
  name: string;
  scope: string;
  status: AgentStatus;
};

export type CreateAgentResult = {
  id: string; // brand-ok — opaque agent primary key
  apiKey: string;
  keyPrefix: string;
  nodeId: TreeNodeId;
};

function parseNodeId(nodeId: string | TreeNodeId): TreeNodeId {
  return typeof nodeId === 'string' ? asTreeNodeId(nodeId) : nodeId;
}

/** Extract the exact 8-char lookup prefix from a full API key. */
export function agentKeyPrefix(apiKey: string): string | null {
  if (!apiKey.startsWith(AGENT_API_KEY_PREFIX)) return null;
  const rest = apiKey.slice(AGENT_API_KEY_PREFIX.length);
  if (rest.length < AGENT_KEY_PREFIX_LEN) return null;
  return rest.slice(0, AGENT_KEY_PREFIX_LEN);
}

/**
 * Mint an agent API key bound to a tree node.
 * Returns the one-time plaintext key; only the hash is stored.
 */
export async function createAgent(
  db: Database,
  nodeId: string | TreeNodeId,
  name: string,
  options?: { scope?: string; status?: AgentStatus }
): Promise<CreateAgentResult> {
  const nid = parseNodeId(nodeId);
  if (!name.trim()) throw new Error('ai-agents: name required');

  const id = crypto.randomUUID();
  const material = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('hex');
  const apiKey = `${AGENT_API_KEY_PREFIX}${material}`;
  const keyPrefix = agentKeyPrefix(apiKey);
  if (!keyPrefix) throw new Error('ai-agents: failed to derive key prefix');

  const apiKeyHash = await Bun.password.hash(apiKey);
  const scope = options?.scope?.trim() || 'default';
  const status: AgentStatus = options?.status ?? 'active';
  const createdAt = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT INTO ai_agents (
       id, node_id, name, api_key_hash, key_prefix, scope, status, created_at
     ) VALUES ($id, $nid, $name, $hash, $pfx, $scope, $status, $created)`,
    {
      $id: id,
      $nid: nid,
      $name: name.trim(),
      $hash: apiKeyHash,
      $pfx: keyPrefix,
      $scope: scope,
      $status: status,
      $created: createdAt,
    }
  );

  return { id, apiKey, keyPrefix, nodeId: nid };
}

/**
 * Authenticate an agent API key.
 * Exact `key_prefix` match + password verify; revoked → null.
 */
export async function verifyAgent(db: Database, apiKey: string): Promise<AgentRecord | null> {
  const keyPrefix = agentKeyPrefix(apiKey);
  if (!keyPrefix) return null;

  const row = db
    .query(
      `SELECT id, node_id, name, api_key_hash, scope, status
       FROM ai_agents
       WHERE key_prefix = $pfx`
    )
    .get({ $pfx: keyPrefix }) as {
    id: string; // brand-ok — opaque agent primary key from sqlite
    node_id: string; // brand-ok — TreeNodeId minted via asTreeNodeId below
    name: string;
    api_key_hash: string;
    scope: string;
    status: string;
  } | null;

  if (!row) return null;
  if (row.status !== 'active') return null;

  const ok = await Bun.password.verify(apiKey, row.api_key_hash);
  if (!ok) return null;

  return {
    id: row.id,
    nodeId: asTreeNodeId(row.node_id),
    name: row.name,
    scope: row.scope,
    status: 'active',
  };
}

/** Mark all agents for a node as revoked (repository-layer node_id filter). */
export function revokeAgentsForNode(db: Database, nodeId: string | TreeNodeId): void {
  const nid = parseNodeId(nodeId);
  db.run(`UPDATE ai_agents SET status = 'revoked' WHERE node_id = $nid`, { $nid: nid });
}

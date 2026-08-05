// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Partner vault — per-node secret isolation via HKDF + AES-GCM.
 *
 * Each tree node derives a distinct AES-256 key from the master material
 * (HKDF-SHA-256, info = node_id). Same logical key name + same plaintext
 * therefore yield different ciphertext across partners.
 *
 * Repository layer: SQL filters on `node_id` belong here (not call sites).
 */
import type { Database } from 'bun:sqlite';
import { base64ToBytes, bytesToBase64 } from '../bytes-base64.ts';
import { asTreeNodeId, type TreeNodeId } from '../types/branded.ts';
import { requireSecret } from './require-secret.ts';

export const PARTNER_VAULT_KEY_VERSION = 1;
export const PARTNER_VAULT_MASTER_ENV = 'PARTNER_VAULT_MASTER_KEY';

const HKDF_SALT = new TextEncoder().encode('factorywager-partner-vault-v1');

export type PartnerVaultOptions = {
  /** Override master key (tests). Default: {@link requireSecret} on PARTNER_VAULT_MASTER_KEY. */
  masterKey?: string;
};

function resolveMasterKey(options?: PartnerVaultOptions): string {
  if (options?.masterKey?.trim()) return options.masterKey.trim();
  return requireSecret(PARTNER_VAULT_MASTER_ENV, 'partner-vault-dev-master-key');
}

function parseNodeId(nodeId: string | TreeNodeId): TreeNodeId {
  return typeof nodeId === 'string' ? asTreeNodeId(nodeId) : nodeId;
}

/** Derive AES-GCM-256 key unique to this partner node. */
export async function derivePartnerAesKey(
  masterKey: string,
  nodeId: TreeNodeId
): Promise<CryptoKey> {
  // Copy into a fresh ArrayBuffer — Bun.CryptoHasher.digest() returns a Buffer
  // whose ArrayBufferLike is not always assignable to BufferSource under tsc.
  const digest = new Bun.CryptoHasher('sha256').update(masterKey).digest();
  const ikm = new Uint8Array(digest.byteLength);
  ikm.set(digest instanceof Uint8Array ? digest : new Uint8Array(digest));
  const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: HKDF_SALT,
      info: new TextEncoder().encode(String(nodeId)),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt plaintext; wire format = base64(12-byte IV ‖ ciphertext+tag). */
export async function encryptPartnerSecret(
  plaintext: string,
  masterKey: string,
  nodeId: TreeNodeId
): Promise<string> {
  const key = await derivePartnerAesKey(masterKey, nodeId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), 12);
  return bytesToBase64(out);
}

/** Decrypt wire format from {@link encryptPartnerSecret}. */
export async function decryptPartnerSecret(
  encryptedValue: string,
  masterKey: string,
  nodeId: TreeNodeId
): Promise<string> {
  const raw = base64ToBytes(encryptedValue);
  if (raw.byteLength < 13) throw new Error('partner-vault: ciphertext too short');
  // slice() (not subarray()) so iv/ct are fresh Uint8Array<ArrayBuffer> views,
  // assignable to BufferSource for crypto.subtle.decrypt (TS lib generics).
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const key = await derivePartnerAesKey(masterKey, nodeId);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/**
 * Upsert a partner secret. Ciphertext is HKDF-isolated by `node_id`.
 */
export async function setPartnerSecret(
  db: Database,
  nodeId: string | TreeNodeId,
  key: string,
  plaintext: string,
  options?: PartnerVaultOptions
): Promise<void> {
  const nid = parseNodeId(nodeId);
  if (!key.trim()) throw new Error('partner-vault: key required');
  const masterKey = resolveMasterKey(options);
  const encrypted = await encryptPartnerSecret(plaintext, masterKey, nid);
  db.query(
    `INSERT INTO partner_vault (node_id, key, encrypted_value, key_version)
     VALUES ($nid, $key, $enc, $ver)
     ON CONFLICT(node_id, key) DO UPDATE SET
       encrypted_value = excluded.encrypted_value,
       key_version = excluded.key_version`
  ).run({
    $nid: String(nid),
    $key: key,
    $enc: encrypted,
    $ver: PARTNER_VAULT_KEY_VERSION,
  });
}

/**
 * Read and decrypt a partner secret. Returns null when missing.
 * Filters by `node_id` only inside this repository module.
 */
export async function getPartnerSecret(
  db: Database,
  nodeId: string | TreeNodeId,
  key: string,
  options?: PartnerVaultOptions
): Promise<string | null> {
  const nid = parseNodeId(nodeId);
  const row = db
    .query(
      `SELECT encrypted_value FROM partner_vault
       WHERE node_id = $nid AND key = $key`
    )
    .get({ $nid: String(nid), $key: key } as Record<string, string>) as {
    encrypted_value: string;
  } | null;
  if (!row) return null;
  return decryptPartnerSecret(row.encrypted_value, resolveMasterKey(options), nid);
}

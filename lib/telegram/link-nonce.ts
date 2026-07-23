/**
 * Telegram link nonce for account binding (R2 TTL ~10m).
 */

import type { R2PutBucket } from '../pages/r2-types.ts';
import { r2GetJson, r2PutJson } from '../pages/r2-types.ts';
import type { PortalAccountId, PortalTenantId } from '../types/branded/portal.ts';
import { linkNonceKey } from '../accounts/account-types.ts';

export type LinkNonceRecord = {
  nonce: string;
  accountId: PortalAccountId;
  tenantId: PortalTenantId;
  createdAt: string;
  expiresAt: string;
};

const TTL_MS = 10 * 60 * 1000;

export function createLinkNonce(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export async function saveLinkNonce(
  bucket: R2PutBucket,
  record: Omit<LinkNonceRecord, 'createdAt' | 'expiresAt'> & { ttlMs?: number }
): Promise<LinkNonceRecord> {
  const now = Date.now();
  const full: LinkNonceRecord = {
    ...record,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (record.ttlMs ?? TTL_MS)).toISOString(),
  };
  await r2PutJson(bucket, linkNonceKey(record.nonce), full);
  return full;
}

export async function consumeLinkNonce(
  bucket: R2PutBucket,
  nonce: string
): Promise<LinkNonceRecord | null> {
  const key = linkNonceKey(nonce);
  const record = await r2GetJson<LinkNonceRecord>(bucket, key);
  if (!record) return null;
  if (new Date(record.expiresAt).getTime() < Date.now()) return null;
  await bucket.put(key, '', { httpMetadata: { contentType: 'application/json' } });
  return record;
}

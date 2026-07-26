/**
 * Ops channel event envelope — distinct from Bun release-channel meta.
 *
 * Topics: identity · plays · dod · experiments · alerts · provisioning · toc
 *
 * `toc` carries TOC operate-lite + return-efficiency bake signals
 * (not Soft mutations on Pages — local journal / CT remain mutate plane).
 */
import type { OpsChannelEventId } from '../types/branded/operations.ts';

export const OPS_CHANNEL_TOPICS = [
  'identity',
  'plays',
  'dod',
  'experiments',
  'alerts',
  'provisioning',
  'toc',
] as const;

export type OpsChannelTopic = (typeof OPS_CHANNEL_TOPICS)[number];

export type OpsChannelProjector = 'r2' | 'telegram' | 'slack';

export type OpsChannelEvent = {
  id: OpsChannelEventId;
  topic: OpsChannelTopic;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  projectors: OpsChannelProjector[];
  createdAt: string;
  /** False when INSERT OR IGNORE skipped a duplicate idempotency_key. */
  inserted?: boolean;
};

export type OpsChannelHealthSlice = {
  pending: number;
  failed: number;
  sent: number;
  oldestPendingAt: string | null;
  failRate: number;
};

export function parseOpsChannelTopic(raw: string): OpsChannelTopic | null {
  return (OPS_CHANNEL_TOPICS as readonly string[]).includes(raw) ? (raw as OpsChannelTopic) : null;
}

export function parseProjectors(raw: string): OpsChannelProjector[] {
  const allowed = new Set<OpsChannelProjector>(['r2', 'telegram', 'slack']);
  return raw
    .split(',')
    .map(s => s.trim())
    .filter((s): s is OpsChannelProjector => allowed.has(s as OpsChannelProjector));
}

// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Resolve production outbox projector opts — R2 when credentials exist, else local memory.
 *
 * Always surfaces `projectorBackend` + `projectorBucket` so callers can distinguish
 * attribution drains (memory) from durable projection (r2 on Pages registry bucket).
 * Use `requireR2: true` to fail closed.
 *
 * Channel plane SSOT: {@link resolveChannelR2BridgeConfig} (not bench `bun-secrets`).
 */
import { resolveChannelR2BridgeConfig } from '../../scripts/lib/r2-bridge.ts';
import { loadTelegramEnv } from '../telegram/telegram-config.ts';
import { createR2ChannelStoreFromConfig } from './r2-channel-bucket.ts';
import type { ProcessOutboxOpts } from './outbox.ts';

export type ProjectorBackend = 'r2' | 'memory';

export type ProductionOutboxOpts = ProcessOutboxOpts & {
  projectorBackend: ProjectorBackend;
  /** Resolved R2 bucket when backend is r2 (Pages registry twin). */
  projectorBucket?: string;
  r2Error?: string;
};

function resolveTelegramToken(override?: string): string {
  return override?.trim() || loadTelegramEnv().effectiveToken || '';
}

export type ResolveProductionOutboxInput = {
  telegramToken?: string;
  deliver?: boolean;
  /** When true, throw instead of falling back to in-process memory. */
  requireR2?: boolean;
};

/** Best-effort R2 durable projector for Bun host (snapshot-cron · ops-sync · flushOutbox). */
export function resolveProductionOutboxOpts(
  input: ResolveProductionOutboxInput = {}
): ProductionOutboxOpts {
  const deliver = input.deliver !== false;
  const telegramToken = resolveTelegramToken(input.telegramToken);
  try {
    const r2 = resolveChannelR2BridgeConfig();
    return {
      deliver,
      telegramToken,
      r2Store: createR2ChannelStoreFromConfig(r2),
      projectorBackend: 'r2',
      projectorBucket: r2.bucket,
    };
  } catch (e) {
    const r2Error = e instanceof Error ? e.message : String(e);
    if (input.requireR2) {
      throw new Error(`R2 outbox required but unavailable: ${r2Error}`);
    }
    console.warn(`[outbox-prod-opts] R2 unavailable — memory projectors (${r2Error})`);
    return {
      deliver,
      telegramToken,
      projectorBackend: 'memory',
      r2Error,
    };
  }
}

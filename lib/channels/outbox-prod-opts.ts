// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Resolve production outbox projector opts — R2 when credentials exist, else local memory.
 */
import { resolveR2BridgeConfig } from '../../scripts/lib/r2-bridge.ts';
import { createR2ChannelStoreFromConfig } from './r2-channel-bucket.ts';
import type { ProcessOutboxOpts } from './outbox.ts';

/** Best-effort R2 durable projector for Bun host (snapshot-cron · ops-sync · flushOutbox). */
export function resolveProductionOutboxOpts(
  input: { telegramToken?: string; deliver?: boolean } = {}
): ProcessOutboxOpts {
  const deliver = input.deliver !== false;
  try {
    const r2 = resolveR2BridgeConfig();
    return {
      deliver,
      telegramToken: input.telegramToken ?? Bun.env.TELEGRAM_BOT_TOKEN ?? '',
      r2Store: createR2ChannelStoreFromConfig(r2),
    };
  } catch {
    return {
      deliver,
      telegramToken: input.telegramToken ?? Bun.env.TELEGRAM_BOT_TOKEN ?? '',
    };
  }
}

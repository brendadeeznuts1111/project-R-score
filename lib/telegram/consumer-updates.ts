/**
 * Drain R2 `telegram-updates` queue → factory bot handler (shared by CLI + tests).
 */
import type { AccountR2Store } from '../accounts/account-r2-store.ts';
import type { R2ChannelStore, MemoryChannelStore, ChannelMessage } from '../channels/channels.ts';
import type { R2PutBucket } from '../pages/r2-types.ts';
import type { TenantConfig } from '../../config/tenants.ts';
import { getTenant, isTenantSlug } from '../../config/tenants.ts';
import { createTenantBot } from './bot.ts';
import { tryObserveKnownChats } from './known-chats.ts';
import type { TelegramUpdateEnqueuePayload } from './webhook-pages.ts';

export type DrainTelegramUpdatesOpts = {
  updates: ChannelMessage[];
  bucket: R2PutBucket;
  channel: R2ChannelStore | MemoryChannelStore;
  accounts: AccountR2Store;
  tenant: TenantConfig;
  env: Record<string, string | undefined>;
  dbPath: string;
};

export type DrainTelegramUpdatesResult = {
  processed: number;
  skipped: number;
  errors: number;
};

/** Process enqueued webhook updates; poison events are skipped (cursor can advance). */
export async function drainTelegramUpdates(opts: DrainTelegramUpdatesOpts): Promise<number> {
  const result = await drainTelegramUpdatesDetailed(opts);
  return result.processed;
}

/** Same as {@link drainTelegramUpdates} with skip/error counts. */
export async function drainTelegramUpdatesDetailed(
  opts: DrainTelegramUpdatesOpts
): Promise<DrainTelegramUpdatesResult> {
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const ev of opts.updates) {
    const p = ev.payload as TelegramUpdateEnqueuePayload;
    if (!p?.tenantSlug || !p.update || !isTenantSlug(p.tenantSlug)) {
      skipped++;
      continue;
    }
    const tenant = getTenant(p.tenantSlug);
    if (!tenant) {
      skipped++;
      continue;
    }

    try {
      tryObserveKnownChats(opts.dbPath, p.update, p.tenantSlug);

      const bot = createTenantBot(p.tenantSlug);
      await bot.handleUpdate(p.update, {
        tenant,
        accounts: opts.accounts,
        bucket: opts.bucket,
        channel: opts.channel,
        env: { ...opts.env, OPS_DB_PATH: opts.dbPath },
      });
      processed++;
    } catch (e) {
      errors++;
      console.warn(
        `[telegram-updates] poison seq=${ev.seq}:`,
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return { processed, skipped, errors };
}

// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram bot command router for multi-tenant portal.
 */

import type { AccountR2Store } from '../accounts/account-r2-store.ts';
import type { PortalAccount } from '../accounts/account-types.ts';
import type { R2ChannelStore, MemoryChannelStore } from '../channels/channels.ts';
import { publishEvent } from '../channels/channels.ts';
import type { R2PutBucket } from '../pages/r2-types.ts';
import { r2GetJson } from '../pages/r2-types.ts';
import { asTelegramUserId } from '../types/branded/portal.ts';
import type { TenantConfig } from '../../config/tenants.ts';
import { consumeLinkNonce } from './link-nonce.ts';
import { runOpsCommand, tryOpenOpsDb } from './ops-bridge.ts';
import { handleFlowCallback } from './flows/callbacks.ts';
import { deliverFlowOutput, flowOutputToPlainText } from './flows/deliver.ts';
import { commandToFlowId, findFlowNodeByTelegram } from './flows/registry.ts';
import { dispatchOpsFlowOutput } from './ops-commands.ts';
import { tryObserveKnownChats } from './known-chats.ts';
import { answerCallbackQuery } from './telegram-api.ts';
import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from './telegram-update.ts';

export type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from './telegram-update.ts';

export type CommandContext = {
  msg: TelegramMessage;
  account: PortalAccount | null;
  tenant: TenantConfig;
  accounts: AccountR2Store;
  bucket: R2PutBucket;
  channel: R2ChannelStore | MemoryChannelStore;
  env: Record<string, string | undefined>;
  opsArgs?: string[];
};

export type TelegramCommand = {
  command: string;
  description: string;
  handler: (ctx: CommandContext) => Promise<string>;
};

function resolveTelegramToken(
  env: Record<string, string | undefined>,
  tenant: TenantConfig
): string | undefined {
  const key = tenant.telegramBotEnvKey;
  return key ? env[key] : undefined;
}

async function dispatchFactoryOpsCommand(ctx: CommandContext, command: string): Promise<string> {
  const args = ctx.opsArgs ?? ctx.msg.text?.split(/\s+/).slice(1) ?? [];
  const result = await runOpsCommand(ctx.env, ctx.bucket, {
    telegramUserId: String(ctx.msg.from.id),
    command,
    args,
  });
  return result.reply;
}

export class TelegramBot {
  private commands = new Map<string, TelegramCommand>();

  register(cmd: TelegramCommand): void {
    this.commands.set(cmd.command, cmd);
  }

  listCommands(): TelegramCommand[] {
    return [...this.commands.values()];
  }

  async handleUpdate(
    update: TelegramUpdate,
    deps: Omit<CommandContext, 'msg' | 'account'>
  ): Promise<void> {
    const dbPath = deps.env.OPS_DB_PATH ?? Bun.env.OPS_DB_PATH ?? 'data/operations.db';
    tryObserveKnownChats(dbPath, update, String(deps.tenant.id));

    if (update.my_chat_member || update.chat_member) {
      if (!update.message && !update.callback_query && !update.channel_post) return;
    }

    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query, deps);
      return;
    }

    const msg = update.message ?? update.channel_post;
    if (!msg?.text) return;

    const text = msg.text.trim();
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const arg = parts[1];
      if (arg?.startsWith('link_')) {
        const nonce = arg.slice(5);
        const record = await consumeLinkNonce(deps.bucket, nonce);
        if (!record) {
          await sendTelegramMessage(deps.env, deps.tenant, msg.chat.id, 'Link expired or invalid.');
          return;
        }
        const linked = await deps.accounts.linkTelegram(
          record.tenantId,
          record.accountId,
          asTelegramUserId(String(msg.from.id))
        );
        if (linked) {
          await deps.channel.publish(
            'ops-sync',
            {
              type: 'telegram_linked',
              tenantId: record.tenantId as string,
              accountId: record.accountId as string,
              telegramUserId: String(msg.from.id),
              oidcSubject: linked.oidcSubject,
              email: linked.email,
              source: 'telegram',
            },
            { sender: 'telegram', tenant: record.tenantId }
          );
        }
        await sendTelegramMessage(
          deps.env,
          deps.tenant,
          msg.chat.id,
          'Telegram linked to your portal account.'
        );
        return;
      }
      if ((deps.tenant.id as string) === 'factory') {
        const token = resolveTelegramToken(deps.env, deps.tenant);
        const db = tryOpenOpsDb(deps.env);
        if (token && db) {
          try {
            const dbPath = deps.env.OPS_DB_PATH ?? Bun.env.OPS_DB_PATH ?? 'data/operations.db';
            const output = dispatchOpsFlowOutput(db, dbPath, {
              telegramUserId: String(msg.from.id),
              command: '/start',
              args: [],
            });
            if (output) {
              await deliverFlowOutput(output, { token, chatId: msg.chat.id, db });
              return;
            }
          } finally {
            db.close();
          }
        }
        // Fallback when OPS DB / token unavailable (queued bridge path).
        const ops = await runOpsCommand(deps.env, deps.bucket, {
          telegramUserId: String(msg.from.id),
          command: '/start',
          args: [],
        });
        await sendTelegramMessage(deps.env, deps.tenant, msg.chat.id, ops.reply);
        return;
      }
      await sendTelegramMessage(
        deps.env,
        deps.tenant,
        msg.chat.id,
        `Welcome to ${deps.tenant.name}. Use /help for commands.`
      );
      return;
    }

    if (!text.startsWith('/')) return;
    const [command, ...argParts] = text.split(/\s+/);
    const cmd = this.commands.get(command!);
    if (!cmd) {
      await sendTelegramMessage(deps.env, deps.tenant, msg.chat.id, 'Unknown command. Try /help');
      return;
    }

    if ((deps.tenant.id as string) === 'factory') {
      const token = resolveTelegramToken(deps.env, deps.tenant);
      const flowId = commandToFlowId(command!);
      const skipFlow = command === '/register' || command === '/verifydod';
      if (token && flowId && !skipFlow) {
        const db = tryOpenOpsDb(deps.env);
        if (db) {
          try {
            const dbPath = deps.env.OPS_DB_PATH ?? Bun.env.OPS_DB_PATH ?? 'data/operations.db';
            const output = dispatchOpsFlowOutput(db, dbPath, {
              telegramUserId: String(msg.from.id),
              command: command!,
              args: argParts,
            });
            if (output) {
              const plain = flowOutputToPlainText(output);
              if (command === '/status' && /not registered/i.test(plain)) {
                const account = await deps.accounts.getByTelegram(
                  asTelegramUserId(String(msg.from.id))
                );
                if (!account || (account.tenantId as string) !== 'factory') {
                  await deliverFlowOutput(output, { token, chatId: msg.chat.id, db });
                  return;
                }
              } else {
                await deliverFlowOutput(output, { token, chatId: msg.chat.id, db });
                return;
              }
            }
          } finally {
            db.close();
          }
        }
      }
    }

    const account = await deps.accounts.getByTelegram(asTelegramUserId(String(msg.from.id)));
    const response = await cmd.handler({
      ...deps,
      msg,
      account,
      opsArgs: argParts,
    });
    await sendTelegramMessage(deps.env, deps.tenant, msg.chat.id, response);
  }

  private async handleCallbackQuery(
    cq: TelegramCallbackQuery,
    deps: Omit<CommandContext, 'msg' | 'account'>
  ): Promise<void> {
    if ((deps.tenant.id as string) !== 'factory') return;

    const token = resolveTelegramToken(deps.env, deps.tenant);
    if (!token) return;

    const telegramUserId = String(cq.from.id);
    const chatId = String(cq.message?.chat.id ?? cq.from.id);
    const msgId = (cq as { message?: { message_id?: number } }).message?.message_id;

    const db = tryOpenOpsDb(deps.env);
    if (!db) {
      await answerCallbackQuery(token, cq.id, 'Ops DB unavailable.');
      return;
    }

    try {
      const dbPath = deps.env.OPS_DB_PATH ?? Bun.env.OPS_DB_PATH ?? 'data/operations.db';
      const node = findFlowNodeByTelegram(db, telegramUserId);
      const output = handleFlowCallback(cq.data?.trim() ?? '', {
        db,
        dbPath,
        chatId,
        userId: telegramUserId,
        messageId: msgId,
        node,
      });

      if (output) {
        await deliverFlowOutput(output, {
          token,
          chatId,
          editMessageId: msgId,
          db,
        });
        await answerCallbackQuery(token, cq.id, output.text.replace(/<[^>]+>/g, '').slice(0, 80));
      } else {
        await answerCallbackQuery(token, cq.id, 'Unknown action.');
      }
    } finally {
      db.close();
    }
  }
}

export async function sendTelegramMessage(
  env: Record<string, string | undefined>,
  tenant: TenantConfig,
  chatId: number,
  text: string
): Promise<void> {
  const token = resolveTelegramToken(env, tenant);
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export function registerFactoryCommands(bot: TelegramBot): void {
  bot.register({
    command: '/status',
    description: 'Ops status or registry health',
    handler: async ctx => {
      const opsReply = await dispatchFactoryOpsCommand(ctx, '/status');
      if (!/not registered/i.test(opsReply)) return opsReply;
      if (!ctx.account || (ctx.account.tenantId as string) !== 'factory') {
        return opsReply;
      }
      const registry = await r2GetJson<{
        packages?: Record<string, unknown>;
        meta?: { coverage?: number };
      }>(ctx.bucket, ctx.tenant.registryKey);
      const pkgCount = Object.keys(registry?.packages ?? {}).length;
      const coverage = registry?.meta?.coverage ?? 0;
      return `*Factory Status*\nPackages: ${pkgCount}\nCoverage: ${coverage}%`;
    },
  });

  bot.register({
    command: '/registry',
    description: 'Factory registry package count',
    handler: async ctx => {
      if (!ctx.account || (ctx.account.tenantId as string) !== 'factory') {
        return 'Not authorized for factory tenant.';
      }
      const registry = await r2GetJson<{ packages?: Record<string, unknown> }>(
        ctx.bucket,
        ctx.tenant.registryKey
      );
      const pkgCount = Object.keys(registry?.packages ?? {}).length;
      return `*Registry*\nPackages: ${pkgCount}`;
    },
  });

  const opsOnly = [
    { command: '/accounts', description: 'Sportsbook accounts' },
    { command: '/plays', description: 'Pending plays' },
    { command: '/tree', description: 'Downstream network' },
    { command: '/register', description: 'Register as sub-agent' },
    { command: '/verifydod', description: 'DOD delivery receipt' },
  ] as const;

  for (const spec of opsOnly) {
    bot.register({
      command: spec.command,
      description: spec.description,
      handler: async ctx => dispatchFactoryOpsCommand(ctx, spec.command),
    });
  }

  bot.register({
    command: '/link',
    description: 'How to link Telegram to portal',
    handler: async () =>
      'Link your portal account: complete onboarding, then `/start link_<nonce>` from the portal.',
  });

  bot.register({
    command: '/deploy',
    description: 'Trigger deploy request',
    handler: async ctx => {
      if (!ctx.account || ctx.account.role !== 'admin') return 'Admin only.';
      await publishEvent(
        ctx.channel,
        'factory',
        {
          event: 'deploy.requested',
          by: ctx.account.id as string,
        },
        { tenant: ctx.account.tenantId, sender: 'telegram' }
      );
      return 'Deploy triggered.';
    },
  });

  bot.register({
    command: '/help',
    description: 'List commands',
    handler: async ctx => {
      return (
        ctx.tenant.name +
        '\n' +
        bot
          .listCommands()
          .map(c => `${c.command} — ${c.description}`)
          .join('\n')
      );
    },
  });
}

export function registerScienceCommands(bot: TelegramBot): void {
  bot.register({
    command: '/metric',
    description: 'Registry health metric',
    handler: async ctx => {
      if (!ctx.account || (ctx.account.tenantId as string) !== 'science') {
        return 'Not authorized for science tenant.';
      }
      return 'Science lab metrics: registry snapshot OK.';
    },
  });

  bot.register({
    command: '/analyze',
    description: 'Run analysis placeholder',
    handler: async ctx => {
      if (!ctx.account) return 'Login required.';
      await publishEvent(
        ctx.channel,
        'science',
        {
          event: 'analyze.requested',
          by: ctx.account.id as string,
        },
        { tenant: ctx.account.tenantId, sender: 'telegram' }
      );
      return 'Analysis queued.';
    },
  });

  bot.register({
    command: '/help',
    description: 'List commands',
    handler: async () => '/metric /analyze /help',
  });
}

export function registerTennisCommands(bot: TelegramBot): void {
  bot.register({
    command: '/markets',
    description: 'List active markets',
    handler: async ctx => {
      if (!ctx.account || (ctx.account.tenantId as string) !== 'tennis') {
        return 'Not authorized for tennis tenant.';
      }
      if (!ctx.env.KALSHI_KEY) return 'Kalshi API not configured.';
      try {
        const res = await fetch('https://api.elections.kalshi.com/trade-api/v2/markets?limit=5', {
          headers: { Authorization: `Bearer ${ctx.env.KALSHI_KEY}` },
        });
        if (!res.ok) return `Kalshi error: ${res.status}`;
        const data = (await res.json()) as { markets?: Array<{ title?: string }> };
        const lines = (data.markets ?? []).map(m => `• ${m.title ?? 'market'}`).join('\n');
        return `*Active Markets*\n${lines || 'No markets'}`;
      } catch {
        return 'Kalshi fetch failed.';
      }
    },
  });

  bot.register({
    command: '/alert',
    description: 'Set price alert',
    handler: async ctx => {
      if (!ctx.account) return 'Login required.';
      const parts = ctx.msg.text?.split(/\s+/) ?? [];
      const market = parts[1];
      const price = parts[2];
      if (!market || !price) return 'Usage: /alert <market> <price>';
      await publishEvent(
        ctx.channel,
        'tennis',
        {
          event: 'alert.set',
          account: ctx.account.id as string,
          market,
          price: Number(price),
        },
        { tenant: ctx.account.tenantId, sender: 'telegram' }
      );
      return `Alert set for ${market} @ ${price}`;
    },
  });

  bot.register({
    command: '/help',
    description: 'List commands',
    handler: async () => '/markets /alert /help',
  });
}

export function createTenantBot(tenantSlug: string): TelegramBot {
  const bot = new TelegramBot();
  if (tenantSlug === 'factory') registerFactoryCommands(bot);
  else if (tenantSlug === 'science') registerScienceCommands(bot);
  else if (tenantSlug === 'tennis') registerTennisCommands(bot);
  return bot;
}

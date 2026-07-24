// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
/**
 * Operations Telegram bot — tree-aware commands via flow cards + inline keyboards.
 *
 * @see lib/telegram/flows/README.md
 */
import { Database } from 'bun:sqlite';
import { DODVerifier } from '../dod/verifier.ts';
import { asTreeNodeId } from '../types/branded/operations.ts';
import { asTelegramUserId } from '../types/branded/portal.ts';
import { onboardPartnerProfile } from '../operations/partner-onboarding.ts';
import { enqueuePartnerWelcomeEvent } from '../channels/outbox.ts';
import { answerCallbackQuery } from './telegram-api.ts';
import { handleFlowCallback } from './flows/callbacks.ts';
import { deliverFlowOutput } from './flows/deliver.ts';
import { commandToFlowId, findFlowNodeByTelegram, runFlow } from './flows/registry.ts';
import type { TreeNode } from './ops-bot-types.ts';

export type { TreeNode } from './ops-bot-types.ts';
export type { BotConfig } from './ops-bot-types.ts';
import type { BotConfig } from './ops-bot-types.ts';
import { loadTelegramEnv } from './telegram-config.ts';

export class OpsTelegramBot {
  private db: Database;
  private dbPath: string;
  private token: string;
  private polling = false;

  constructor(config: BotConfig) {
    this.token = config.token || loadTelegramEnv().effectiveToken || '';
    this.dbPath = config.dbPath;
    this.db = new Database(config.dbPath);
    this.db.run('PRAGMA journal_mode=WAL');
  }

  async start(): Promise<void> {
    let offset = 0;
    this.polling = true;
    while (this.polling) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.token}/getUpdates?offset=${offset}&timeout=30`
        );
        if (!res.ok) {
          await Bun.sleep(5000);
          continue;
        }
        const data = (await res.json()) as { result?: Record<string, unknown>[] };
        for (const update of data.result ?? []) {
          const uid = update.update_id;
          if (typeof uid === 'number') offset = Math.max(offset, uid + 1);
          await this.handleUpdate(update);
        }
      } catch {
        await Bun.sleep(3000);
      }
    }
  }

  stop(): void {
    this.polling = false;
  }

  async handleUpdate(update: Record<string, unknown>): Promise<void> {
    const cq = update.callback_query as Record<string, unknown> | undefined;
    if (cq) {
      await this.handleCallbackQuery(cq);
      return;
    }

    const msg = update.message as Record<string, unknown> | undefined;
    if (!msg?.text) return;

    const text = (msg.text as string).trim();
    const [cmd, ...args] = text.split(/\s+/);
    const userId = String((msg.from as Record<string, unknown>)?.id);
    const chatId = Number((msg.chat as Record<string, unknown>)?.id);

    const node = findFlowNodeByTelegram(this.db, userId);

    if (cmd === '/register') {
      await this.handleRegister(chatId, userId, node as TreeNode | null, args);
      return;
    }
    if (cmd === '/verifydod') {
      await this.handleVerifyDod(chatId, node as TreeNode | null, args);
      return;
    }

    const flowId = commandToFlowId(cmd);
    if (flowId) {
      const output = runFlow(this.db, this.dbPath, {
        flowId: cmd === '/start' && !node ? 'menu' : flowId,
        chatId: String(chatId),
        userId,
      });
      await deliverFlowOutput(output, { token: this.token, chatId });
      return;
    }

    if (!cmd.startsWith('/')) return;

    const fallback = runFlow(this.db, this.dbPath, {
      flowId: 'menu',
      chatId: String(chatId),
      userId,
    });
    await deliverFlowOutput(fallback, { token: this.token, chatId });
  }

  private async handleCallbackQuery(cq: Record<string, unknown>): Promise<void> {
    const data = String(cq.data ?? '');
    const userId = String((cq.from as Record<string, unknown>)?.id);
    const chatId = String(
      (cq.message as Record<string, unknown> | undefined)?.chat
        ? ((cq.message as Record<string, unknown>).chat as Record<string, unknown>).id
        : userId
    );
    const messageId = (cq.message as Record<string, unknown> | undefined)?.message_id;
    const node = findFlowNodeByTelegram(this.db, userId);

    const output = handleFlowCallback(data, {
      db: this.db,
      dbPath: this.dbPath,
      chatId,
      userId,
      messageId: typeof messageId === 'number' ? messageId : undefined,
      node,
    });

    if (output) {
      await deliverFlowOutput(output, {
        token: this.token,
        chatId,
        editMessageId: typeof messageId === 'number' ? messageId : undefined,
      });
    }

    const cqId = String(cq.id ?? '');
    if (cqId) {
      await answerCallbackQuery(this.token, cqId, output?.text.slice(0, 80) ?? 'OK');
    }
  }

  private async handleVerifyDod(
    chatId: number,
    node: TreeNode | null,
    args: string[]
  ): Promise<void> {
    if (!node) {
      await deliverFlowOutput(
        { text: '❌ Not registered', parseMode: 'HTML' },
        { token: this.token, chatId }
      );
      return;
    }
    const dodId = args[0]?.trim();
    if (!dodId) {
      await deliverFlowOutput(
        { text: 'Usage: /verifydod &lt;dod-id&gt;', parseMode: 'HTML' },
        { token: this.token, chatId }
      );
      return;
    }
    const verifier = new DODVerifier(this.dbPath);
    try {
      const r = verifier.receipt(dodId) as Record<string, unknown> | null;
      if (!r || r.agent_id !== node.id) {
        await deliverFlowOutput(
          { text: '❌ DOD not found', parseMode: 'HTML' },
          { token: this.token, chatId }
        );
        return;
      }
      await deliverFlowOutput(
        {
          text: [
            '<b>DOD Receipt</b>',
            `ID: ${String(r.id).slice(0, 8)}…`,
            `Type: ${r.type}`,
            `Status: <b>${r.status}</b>`,
            `Submitted: ${r.submitted_at}`,
          ].join('\n'),
          parseMode: 'HTML',
        },
        { token: this.token, chatId }
      );
    } finally {
      verifier.close();
    }
  }

  private async handleRegister(
    chatId: number,
    userId: string, // brand-ok — Telegram user id wire
    node: TreeNode | null,
    args: string[]
  ): Promise<void> {
    if (node) {
      await deliverFlowOutput(
        { text: '✅ Already registered.', parseMode: 'HTML' },
        { token: this.token, chatId }
      );
      return;
    }

    const [refId, ...nameParts] = args;
    if (!refId || !nameParts.length) {
      await deliverFlowOutput(
        { text: 'Usage: /register &lt;referral-id&gt; &lt;your-name&gt;', parseMode: 'HTML' },
        { token: this.token, chatId }
      );
      return;
    }

    const name = nameParts.join(' ');
    const parent = this.db
      .query('SELECT * FROM tree_nodes WHERE id = $r AND active = 1')
      .get({ $r: refId }) as TreeNode | null;

    if (!parent) {
      await deliverFlowOutput(
        { text: '❌ Invalid referral ID.', parseMode: 'HTML' },
        { token: this.token, chatId }
      );
      return;
    }

    const newId = Bun.randomUUIDv7();
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
       VALUES ($id, 'sub_agent', $pid, $eid, $name, $tg, 1, 'active', $now)`,
      {
        $id: newId,
        $pid: parent.id,
        $eid: parent.expert_id,
        $name: name,
        $tg: userId,
        $now: now,
      }
    );

    const binding = onboardPartnerProfile(this.db, asTreeNodeId(newId), {
      referralNodeId: parent.id,
      source: 'telegram',
    });
    if (binding.created) {
      enqueuePartnerWelcomeEvent(this.db, {
        treeNodeId: binding.treeNodeId,
        profileKey: binding.profileKey as string,
        partnerTemplate: binding.templateId,
        lifecycleStatus: binding.lifecycleStatus,
        telegramId: asTelegramUserId(userId),
        nodeName: name,
      });
    }

    await deliverFlowOutput(
      {
        text: `✅ Registered as sub-agent of <b>${parent.name}</b>\nYour ID: <code>${newId}</code>`,
        parseMode: 'HTML',
      },
      { token: this.token, chatId }
    );

    if (parent.telegram_id) {
      await deliverFlowOutput(
        { text: `📢 New sub-agent: ${name}`, parseMode: 'HTML' },
        { token: this.token, chatId: parent.telegram_id }
      );
    }
  }
}

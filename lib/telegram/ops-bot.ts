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
import { ingestAccountingDodPhoto } from '../dod/telegram-accounting-ingest.ts';
import { DODVerifier } from '../dod/verifier.ts';
import { asTreeNodeId } from '../types/branded/operations.ts';
import { asTelegramUserId } from '../types/branded/portal.ts';
import { onboardPartnerProfile } from '../operations/partner-onboarding.ts';
import { enqueuePartnerWelcomeEvent } from '../channels/outbox.ts';
import { answerCallbackQuery, sendTelegramBotMessage } from './telegram-api.ts';
import { handleSeatDeskCallback, isSeatDeskCallback } from './seat-desk-callback.ts';
import { handleSeatDeskReply } from './seat-desk-reply.ts';
import { observeKnownChatsFromUpdate } from './known-chats.ts';
import type { TelegramUpdate } from './telegram-update.ts';
import { handleFlowCallback } from './flows/callbacks.ts';
import { deliverFlowOutput } from './flows/deliver.ts';
import { commandToFlowId, findFlowNodeByTelegram, runFlow } from './flows/registry.ts';
import type { TreeNode } from './ops-bot-types.ts';

export type { TreeNode } from './ops-bot-types.ts';
export type { BotConfig } from './ops-bot-types.ts';
import type { BotConfig } from './ops-bot-types.ts';
import { loadTelegramEnv } from './telegram-config.ts';
import { telegramBotApiUrl } from './telegram-api-url.ts';

export class OpsTelegramBot {
  private db: Database;
  private dbPath: string;
  private token: string;
  private polling = false;
  private accountingIngest?: BotConfig['accountingIngest'];

  constructor(config: BotConfig) {
    this.token = config.token || loadTelegramEnv().effectiveToken || '';
    this.dbPath = config.dbPath;
    this.accountingIngest = config.accountingIngest;
    this.db = new Database(config.dbPath);
    this.db.run('PRAGMA journal_mode=WAL');
  }

  async start(): Promise<void> {
    let offset = 0;
    this.polling = true;
    while (this.polling) {
      try {
        const url = new URL(telegramBotApiUrl(this.token, 'getUpdates'));
        url.searchParams.set('offset', String(offset));
        url.searchParams.set('timeout', '30');
        const res = await fetch(url);
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
    observeKnownChatsFromUpdate({
      db: this.db,
      update: update as TelegramUpdate,
    });

    if (update.my_chat_member || update.chat_member) {
      if (!update.message && !update.edited_message && !update.callback_query) return;
    }

    const cq = update.callback_query as Record<string, unknown> | undefined;
    if (cq) {
      await this.handleCallbackQuery(cq);
      return;
    }

    const msg = (update.message ?? update.edited_message) as Record<string, unknown> | undefined;
    if (msg) {
      const photoIngest = await ingestAccountingDodPhoto(msg, {
        token: this.token,
        db: this.db,
        dbPath: this.dbPath,
        ...this.accountingIngest,
      });
      if (photoIngest.handled) {
        const chatId = Number((msg.chat as Record<string, unknown>)?.id);
        if (Number.isFinite(chatId)) {
          await sendTelegramBotMessage(this.token, {
            chatId,
            text: photoIngest.replyText,
            parseMode: 'HTML',
            messageThreadId:
              typeof msg.message_thread_id === 'number' ? msg.message_thread_id : undefined,
          });
        }
        return;
      }
    }

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
      await deliverFlowOutput(output, { token: this.token, chatId, db: this.db });
      return;
    }

    if (!cmd.startsWith('/')) {
      const replyTo = msg.reply_to_message as Record<string, unknown> | undefined;
      const seatReply = await handleSeatDeskReply({
        token: this.token,
        userId,
        chatId: String(chatId),
        text,
        replyToMessageId: typeof replyTo?.message_id === 'number' ? replyTo.message_id : undefined,
        messageThreadId:
          typeof msg.message_thread_id === 'number' ? msg.message_thread_id : undefined,
      });
      if (seatReply.handled) return;
      return;
    }

    const fallback = runFlow(this.db, this.dbPath, {
      flowId: 'menu',
      chatId: String(chatId),
      userId,
    });
    await deliverFlowOutput(fallback, { token: this.token, chatId, db: this.db });
  }

  private async handleCallbackQuery(cq: Record<string, unknown>): Promise<void> {
    const data = String(cq.data ?? '');
    const cqId = String(cq.id ?? '');
    const userId = String((cq.from as Record<string, unknown>)?.id);
    const chatId = String(
      (cq.message as Record<string, unknown> | undefined)?.chat
        ? ((cq.message as Record<string, unknown>).chat as Record<string, unknown>).id
        : userId
    );
    const messageId = (cq.message as Record<string, unknown> | undefined)?.message_id;
    const threadId = (cq.message as Record<string, unknown> | undefined)?.message_thread_id;

    if (isSeatDeskCallback(data)) {
      const seatResult = await handleSeatDeskCallback({
        token: this.token,
        data,
        chatId,
        messageId: typeof messageId === 'number' ? messageId : 0,
        userId,
        messageThreadId: typeof threadId === 'number' ? threadId : undefined,
      });
      if (cqId) {
        await answerCallbackQuery(
          this.token,
          cqId,
          seatResult?.toast.slice(0, 80) ?? 'Unknown desk action.'
        );
      }
      return;
    }

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
        db: this.db,
      });
    }

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
            r.visual_hash ? `Visual hash: <code>${String(r.visual_hash).slice(0, 16)}…</code>` : '',
            r.signature ? `Signature: <code>${String(r.signature).slice(0, 16)}…</code>` : '',
          ]
            .filter(Boolean)
            .join('\n'),
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

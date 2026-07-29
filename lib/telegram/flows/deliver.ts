// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Deliver FlowOutput via Telegram Bot API (send or edit).
 */
import type { Database } from 'bun:sqlite';
import { getChatChannelMeta, rememberTemplateMessageId } from './channel-meta.ts';
import { editTelegramMessage, sendTelegramBotMessage } from '../telegram-api.ts';
import type { TemplateId } from '../templates/types.ts';
import { translateKeyboard } from './keyboards.ts';
import type { FlowLocale, FlowOutput } from './types.ts';

export type DeliverFlowOpts = {
  token: string;
  chatId: string | number; // brand-ok — Telegram chat_id wire
  fetchImpl?: typeof globalThis.fetch;
  locale?: FlowLocale;
  editMessageId?: number;
  db?: Database;
  templateId?: TemplateId;
};

export async function deliverFlowOutput(
  output: FlowOutput,
  opts: DeliverFlowOpts
): Promise<{ messageId?: number; ok: boolean }> {
  const locale = opts.locale ?? 'en';
  const replyMarkup = output.keyboard ? translateKeyboard(output.keyboard, locale) : undefined;
  let messageId = output.editMessageId ?? opts.editMessageId;
  const templateId = output.templateId ?? opts.templateId;

  if (messageId == null && templateId && opts.db) {
    const meta = getChatChannelMeta(opts.db, String(opts.chatId));
    const remembered = meta?.lastTemplateIds?.[templateId];
    if (remembered != null) messageId = remembered;
  }

  if (messageId != null) {
    const edited = await editTelegramMessage(
      opts.token,
      {
        chatId: opts.chatId,
        messageId,
        text: output.text,
        parseMode: output.parseMode === 'Markdown' ? 'Markdown' : 'HTML',
        replyMarkup,
      },
      opts.fetchImpl
    );
    if (edited.ok) {
      if (opts.db && templateId) {
        rememberTemplateMessageId(opts.db, String(opts.chatId), templateId, messageId);
      }
      return { ok: true, messageId };
    }
  }

  const sent = await sendTelegramBotMessage(
    opts.token,
    {
      chatId: opts.chatId,
      text: output.text,
      parseMode: output.parseMode === 'Markdown' ? 'Markdown' : 'HTML',
      replyMarkup,
    },
    opts.fetchImpl
  );

  if (sent.ok && opts.db && templateId && sent.messageId != null) {
    rememberTemplateMessageId(opts.db, String(opts.chatId), templateId, sent.messageId);
  }

  return { ok: sent.ok, messageId: sent.messageId };
}

/** Plain text for webhook bridge paths without inline keyboards. */
export function flowOutputToPlainText(output: FlowOutput): string {
  return output.text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<');
}

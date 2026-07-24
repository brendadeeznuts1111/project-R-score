/**
 * Deliver FlowOutput via Telegram Bot API (send or edit).
 */
import { editTelegramMessage, sendTelegramBotMessage } from '../telegram-api.ts';
import { translateKeyboard } from './keyboards.ts';
import type { FlowLocale, FlowOutput } from './types.ts';

export type DeliverFlowOpts = {
  token: string;
  chatId: string | number; // brand-ok — Telegram chat_id wire
  locale?: FlowLocale;
  editMessageId?: number;
};

export async function deliverFlowOutput(
  output: FlowOutput,
  opts: DeliverFlowOpts
): Promise<{ messageId?: number; ok: boolean }> {
  const locale = opts.locale ?? 'en';
  const replyMarkup = output.keyboard ? translateKeyboard(output.keyboard, locale) : undefined;
  const messageId = output.editMessageId ?? opts.editMessageId;

  if (messageId != null) {
    const edited = await editTelegramMessage(opts.token, {
      chatId: opts.chatId,
      messageId,
      text: output.text,
      parseMode: output.parseMode === 'Markdown' ? 'Markdown' : 'HTML',
      replyMarkup,
    });
    if (edited.ok) return { ok: true, messageId };
  }

  const sent = await sendTelegramBotMessage(opts.token, {
    chatId: opts.chatId,
    text: output.text,
    parseMode: output.parseMode === 'Markdown' ? 'Markdown' : 'HTML',
    replyMarkup,
  });

  return { ok: sent.ok, messageId: sent.messageId };
}

/** Plain text for webhook bridge paths without inline keyboards. */
export function flowOutputToPlainText(output: FlowOutput): string {
  return output.text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<');
}

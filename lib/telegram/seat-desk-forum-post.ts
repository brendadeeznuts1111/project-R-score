/**
 * Seat desk forum-thread posting — plain-text posts to package-group forum topics.
 *
 * Extracted from `seat-capital-desk.ts` (strong import-cycle burn-down) so
 * `partner-forum-accounting.ts` can post without importing the desk renderer.
 * `seat-capital-desk.ts` re-exports everything here for backward compatibility.
 */
import {
  PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY,
  PACKAGE_GROUP_FORUMS_META_DIR,
  PACKAGE_GROUP_LIQUIDITY_OUTS_TOPIC_KEY,
  resolvePackageGroupForumThread,
} from './package-group-forum.ts';
import type { SeatIntakeRecord } from './seat-intake.ts';
import { sendTelegramBotMessage } from './telegram-api.ts';

/** Liquidity/Outs forum thread for a call-sign (desk metadata preferred). */
export async function resolveSeatDeskLiquidityThread(
  record: SeatIntakeRecord,
  forumsMetaDir?: string
): Promise<{ chatId: string; messageThreadId: number }> {
  // brand-ok — Telegram chat_id wire
  const desk = record.desk;
  if (desk?.chatId && desk.messageThreadId != null && desk.messageThreadId > 0) {
    return { chatId: desk.chatId, messageThreadId: desk.messageThreadId };
  }

  const code = record.partnerCode.toUpperCase().trim();
  return resolvePackageGroupForumThread(
    code,
    PACKAGE_GROUP_LIQUIDITY_OUTS_TOPIC_KEY,
    forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR
  );
}

export type PostPackageGroupForumThreadMessageResult = {
  ok: boolean;
  messageId?: number;
  chatId: string; // brand-ok — Telegram chat_id wire
  messageThreadId: number;
  topicKey: string;
  description?: string;
};

/** Plain-text post to a package-group forum topic (accounting proof, etc.). */
export async function postPackageGroupForumThreadMessage(opts: {
  token: string;
  partnerCode: string;
  topicKey: string;
  text: string;
  forumsMetaDir?: string;
}): Promise<PostPackageGroupForumThreadMessageResult> {
  const { chatId, messageThreadId } = await resolvePackageGroupForumThread(
    opts.partnerCode,
    opts.topicKey,
    opts.forumsMetaDir
  );
  const sent = await sendTelegramBotMessage(opts.token, {
    chatId,
    text: opts.text,
    messageThreadId,
  });
  return {
    ok: sent.ok,
    messageId: sent.messageId,
    chatId,
    messageThreadId,
    topicKey: opts.topicKey.toLowerCase(),
    description: sent.description,
  };
}

export async function postSeatDeskAccountingThreadMessage(opts: {
  token: string;
  record: SeatIntakeRecord;
  text: string;
  forumsMetaDir?: string;
}): Promise<PostPackageGroupForumThreadMessageResult> {
  return postPackageGroupForumThreadMessage({
    token: opts.token,
    partnerCode: opts.record.partnerCode,
    topicKey: PACKAGE_GROUP_ACCOUNTING_TOPIC_KEY,
    text: opts.text,
    forumsMetaDir: opts.forumsMetaDir,
  });
}

export type PostSeatDeskLiquidityThreadMessageResult = {
  ok: boolean;
  messageId?: number;
  chatId: string; // brand-ok — Telegram chat_id wire
  messageThreadId: number;
  description?: string;
};

/** Plain-text partner thread post (topic prompts — not the pinned desk). */
export async function postSeatDeskLiquidityThreadMessage(opts: {
  token: string;
  record: SeatIntakeRecord;
  text: string;
  forumsMetaDir?: string;
}): Promise<PostSeatDeskLiquidityThreadMessageResult> {
  const { chatId, messageThreadId } = await resolveSeatDeskLiquidityThread(
    opts.record,
    opts.forumsMetaDir
  );
  const sent = await sendTelegramBotMessage(opts.token, {
    chatId,
    text: opts.text,
    messageThreadId,
  });
  return {
    ok: sent.ok,
    messageId: sent.messageId,
    chatId,
    messageThreadId,
    description: sent.description,
  };
}

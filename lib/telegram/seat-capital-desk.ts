// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://core.telegram.org/bots/api#inputrichmessage — Bot API 10.1 rich_message
// @see https://core.telegram.org/type/RichText — MTProto RichText (client TL; see rich-message.ts map)
/**
 * Package seat capital desk — one pinned Telegram message per call-sign.
 *
 * **Render modes** (soft-fallback chain in `publishSeatCapitalDesk`)
 * - **rich / blocks** (preferred): `sendRichMessage` / `editMessageText` +
 *   `InputRichMessage.blocks` — typed `RichText` tree ([`rich-message.ts`](./rich-message.ts)),
 *   built by `buildSeatCapitalDeskRichBlocks` / `buildSeatCapitalDeskRichMessage`.
 * - **rich / html** (fallback when `blocks` is rejected as unsupported): same tree
 *   rendered to extended HTML via `serializeRichBlocksToHtml` — see
 *   `formatSeatCapitalDeskRichHtml` / `buildSeatCapitalDeskRichMessageHtml`.
 * - **legacy** (fallback when rich_message itself is unsupported): HTML `parse_mode` +
 *   `<pre>` monospace table (`formatSeatCapitalDeskHtml`).
 *
 * Intake model + pure desk helpers live in [`seat-intake.ts`](./seat-intake.ts);
 * forum-thread posting lives in [`seat-desk-forum-post.ts`](./seat-desk-forum-post.ts).
 * Both are re-exported here for backward compatibility.
 *
 * **Interactivity**: inline keyboard under the message (`sd:*` callbacks) — see
 * [`seat-desk-callback.ts`](./seat-desk-callback.ts). Table cells stay display-only.
 *
 * Columns: # · BOOK · USERNAME · DEPOSIT METHOD · SEND TO · MAX BET · FP% DEP (+ STATUS in rich mode). Partner code omitted — desk lives in the partner forum thread. Passwords stay in intake JSON only.
 */
import {
  blockChecklist,
  blockDetails,
  blockDivider,
  blockHeading,
  blockParagraph,
  blockTable,
  buildInputRichMessageBlocks,
  buildInputRichMessageHtml,
  isRichMessageUnsupported,
  rtBold,
  rtConcat,
  rtItalic,
  rtMarked,
  serializeRichBlocksToHtml,
  type InputRichBlock,
  type InputRichMessage,
  type RichText,
  type RichTableCellBlock,
} from './rich-message.ts';
import { loadTelegramEnv } from './telegram-config.ts';
import {
  editTelegramMessage,
  editRichTelegramMessage,
  isTelegramMessageNotModified,
  sendRichTelegramMessage,
  sendTelegramBotMessage,
  telegramApiCall,
} from './telegram-api.ts';
import {
  loadPackageGroupForumMetadata,
  PACKAGE_GROUP_FORUMS_META_DIR,
} from './package-group-forum.ts';
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../operations/db.ts';
import { ensurePartnerForumAccounting } from './partner-forum-accounting.ts';
import { buildSeatDeskRootMarkup } from './seat-desk-markup.ts';
import {
  buildSeatDeskViewModel,
  firstIncompleteOutIndex,
  formatDeskTimestamp,
  formatSeatCapitalDeskHtml,
  normalizeSeatIntake,
  outSequenceNumber,
  saveSeatIntake,
  SEAT_DESK_DEPOSIT_METHOD_COL,
  SEAT_DESK_FREEPLAY_PCT_COL,
  SEAT_DESK_MAX_BET_COL,
  SEAT_DESK_OUT_NUM_COL,
  SEAT_INTAKE_DIR,
  type SeatFundStatus,
  type SeatIntakeRecord,
  type SeatOutDisplayStatus,
} from './seat-intake.ts';

// ── Backward-compat re-exports (extracted 2026-07 — import the leaf modules directly) ──
export {
  applyDefaultDepositTo,
  applyDefaultPayment,
  applyHarnessStagingIntake,
  applyHarnessStagingRails,
  applyIntakeField,
  buildSeatDeskTableCopyBody,
  buildSeatDeskTableCopyReplyLine,
  buildSeatDeskTableCopyText,
  buildSeatDeskTodoCopyText,
  buildSeatDeskViewModel,
  buildSeatOutDeskLines,
  findSeatOutIndex,
  firstIncompleteOutIndex,
  formatDeskTimestamp,
  formatFreeplayPct,
  formatFundStatusLine,
  formatOutId,
  formatSeatCapitalDeskHtml,
  formatSeatOutList,
  harnessStagingBookLogin,
  harnessStagingSendTo,
  isOutDeferred,
  isSeatOutFillable,
  isSeatOutIncomplete,
  listOutMissingFieldLabels,
  listOutTodoMissingFieldLabels,
  loadSeatIntake,
  normalizeSeatIntake,
  outSequenceNumber,
  parsePaymentLine,
  patchSeatOut,
  PAYMENT_RAIL_NAMES,
  resolveFundStatus,
  resolveOutId,
  saveSeatIntake,
  SEAT_DESK_DEPOSIT_METHOD_COL,
  SEAT_DESK_FREEPLAY_PCT_COL,
  SEAT_DESK_MAX_BET_COL,
  SEAT_DESK_OUT_NUM_COL,
  SEAT_DESK_PARTNER_COL,
  SEAT_DESK_PIPE_FORMAT_LINES,
  SEAT_INTAKE_DIR,
  seatIntakePath,
  tryParseDeskStatus,
  type PatchSeatOutInput,
  type SeatDeskChecklistItem,
  type SeatDeskOutView,
  type SeatDeskViewModel,
  type SeatFundStatus,
  type SeatIntakeRecord,
  type SeatOut,
  type SeatOutDisplayStatus,
} from './seat-intake.ts';
export {
  postPackageGroupForumThreadMessage,
  postSeatDeskAccountingThreadMessage,
  postSeatDeskLiquidityThreadMessage,
  resolveSeatDeskLiquidityThread,
  type PostPackageGroupForumThreadMessageResult,
  type PostSeatDeskLiquidityThreadMessageResult,
} from './seat-desk-forum-post.ts';

/** FUND line emphasis. */
function fundStatusRichText(status: SeatFundStatus): RichText {
  return status === 'blocked' ? rtMarked(rtBold(status)) : rtBold(status);
}

/** STATUS column emphasis. */
function outStatusRichText(status: SeatOutDisplayStatus): RichText {
  if (status === 'deferred') return rtItalic(rtBold('Deferred'));
  if (status === 'blocked') return rtMarked(rtBold(status));
  return rtBold(status);
}

/**
 * Typed `InputRichBlock[]` tree for the desk message — heading, FUND line,
 * #/BOOK/USERNAME/DEPOSIT METHOD/SEND TO/MAX BET/FP% DEP/STATUS table, per-out detail
 * sections, a funding checklist, and an Actions section. Serializes to HTML
 * via `serializeRichBlocksToHtml` for the HTML fallback / legacy-compatible view.
 */
export function buildSeatCapitalDeskRichBlocks(
  record: SeatIntakeRecord,
  now = new Date()
): InputRichBlock[] {
  const vm = buildSeatDeskViewModel(record);

  const blocks: InputRichBlock[] = [
    blockHeading(`${record.callSign} · Capital desk`, 2),
    blockParagraph(rtItalic(`${formatDeskTimestamp(now)} CT`)),
    blockParagraph(rtConcat('FUND ', fundStatusRichText(vm.fundStatus), ' — ', vm.fundDetail)),
    blockDivider(),
  ];

  const header: RichTableCellBlock[] = [
    { text: SEAT_DESK_OUT_NUM_COL, is_header: true },
    { text: 'BOOK', is_header: true },
    { text: 'USERNAME', is_header: true },
    { text: SEAT_DESK_DEPOSIT_METHOD_COL, is_header: true },
    { text: 'SEND TO', is_header: true },
    { text: SEAT_DESK_MAX_BET_COL, is_header: true },
    { text: SEAT_DESK_FREEPLAY_PCT_COL, is_header: true },
    { text: 'STATUS', is_header: true },
  ];
  const rows: RichTableCellBlock[][] = vm.outs.map(out => [
    { text: out.outNum },
    { text: out.book },
    { text: out.username },
    { text: out.depositMethod },
    { text: out.sendTo },
    { text: out.maxBet },
    { text: out.freeplayPct },
    { text: outStatusRichText(out.status) },
  ]);
  blocks.push(blockTable([header, ...rows], { isBordered: true, isStriped: true }));
  blocks.push(blockDivider());

  const detailBlocks: InputRichBlock[] = [];
  for (const out of vm.outs) {
    const fields: InputRichBlock[] = [];
    if (out.balance) fields.push(blockParagraph(`Balance: ${out.balance}`));
    if (out.withdrawPath) fields.push(blockParagraph(`Withdraw: ${out.withdrawPath}`));
    if (out.note) fields.push(blockParagraph(`Note: ${out.note}`));
    if (fields.length) {
      detailBlocks.push(blockDetails(`Out ${out.outNum} – ${out.book}`, fields));
    }
  }
  blocks.push(...detailBlocks);

  blocks.push(blockDivider());
  blocks.push(blockChecklist(vm.checklist));

  blocks.push(blockHeading('Actions', 3));
  const hintOut = firstIncompleteOutIndex(record);
  const replyHint =
    hintOut != null
      ? `${outSequenceNumber(hintOut)} | Venmo | @yourhandle`
      : '1 | Venmo | @yourhandle';
  blocks.push(blockParagraph(`Copy table · Copy todo · Fill per out, or reply: ${replyHint}`));

  return blocks;
}

/** Bot API 10.1 extended HTML for sendRichMessage / editMessageText rich_message. */
export function formatSeatCapitalDeskRichHtml(record: SeatIntakeRecord, now = new Date()): string {
  return serializeRichBlocksToHtml(buildSeatCapitalDeskRichBlocks(record, now));
}

/** `InputRichMessage.blocks` (preferred) — typed RichText tree. */
export function buildSeatCapitalDeskRichMessage(
  record: SeatIntakeRecord,
  now = new Date()
): InputRichMessage {
  return buildInputRichMessageBlocks(buildSeatCapitalDeskRichBlocks(record, now));
}

/** `InputRichMessage.html` — fallback for servers that reject `blocks`. */
export function buildSeatCapitalDeskRichMessageHtml(
  record: SeatIntakeRecord,
  now = new Date()
): InputRichMessage {
  return buildInputRichMessageHtml(formatSeatCapitalDeskRichHtml(record, now));
}

export { buildSeatDeskRootMarkup as buildSeatDeskReplyMarkup } from './seat-desk-markup.ts';

export type PublishSeatCapitalDeskOpts = {
  token: string;
  record: SeatIntakeRecord;
  forumsMetaDir?: string;
  intakeDir?: string;
  pin?: boolean;
};

export type PublishSeatCapitalDeskResult = {
  callSign: string;
  chatId: string; // brand-ok
  messageThreadId: number;
  messageId: number;
  created: boolean;
  pinned: boolean;
  intakePath: string;
  renderMode: 'rich' | 'legacy';
};

export async function publishSeatCapitalDesk(
  opts: PublishSeatCapitalDeskOpts
): Promise<PublishSeatCapitalDeskResult> {
  const record = normalizeSeatIntake(opts.record);
  const code = record.partnerCode.toUpperCase().trim();
  const meta = await loadPackageGroupForumMetadata(code, {
    rootDir: opts.forumsMetaDir ?? PACKAGE_GROUP_FORUMS_META_DIR,
  });
  if (!meta?.chatId) {
    throw new Error(`No forum metadata for ${code}`);
  }

  const threadId = meta.topicsThreadMap?.['liquidity/outs'];
  if (threadId == null || threadId <= 0) {
    throw new Error(`No liquidity/outs topic for ${code}`);
  }

  const now = new Date();
  const replyMarkup = buildSeatDeskRootMarkup(record);
  const preferRich = loadTelegramEnv().seatDeskRichMessages;
  const existing = record.desk;
  let messageId = 0;
  let created = false;
  let renderMode: 'rich' | 'legacy' = 'legacy';

  const canEditExisting =
    existing?.messageId && existing.chatId === meta.chatId && existing.messageThreadId === threadId;

  const sendOrEditRich = (richMessage: InputRichMessage) =>
    canEditExisting
      ? editRichTelegramMessage(opts.token, {
          chatId: meta.chatId,
          messageId: existing!.messageId,
          richMessage,
          replyMarkup,
        })
      : sendRichTelegramMessage(opts.token, {
          chatId: meta.chatId,
          richMessage,
          messageThreadId: threadId,
          replyMarkup,
        });

  if (preferRich) {
    // 1. Prefer typed `blocks` — falls back to extended HTML, then legacy <pre>
    //    below, whenever the server soft-rejects the payload (old Bot API / disabled feature).
    let attempt = await sendOrEditRich(buildSeatCapitalDeskRichMessage(record, now));

    if (!attempt.ok && isRichMessageUnsupported(attempt)) {
      attempt = await sendOrEditRich(buildSeatCapitalDeskRichMessageHtml(record, now));
    }

    if (attempt.ok || (canEditExisting && isTelegramMessageNotModified(attempt))) {
      messageId = canEditExisting ? existing!.messageId : attempt.messageId!;
      created = !canEditExisting;
      renderMode = 'rich';
    } else if (!isRichMessageUnsupported(attempt)) {
      throw new Error(attempt.description ?? 'rich_message failed');
    }
  }

  if (renderMode === 'legacy') {
    const text = formatSeatCapitalDeskHtml(record, now);
    if (canEditExisting) {
      const edited = await editTelegramMessage(opts.token, {
        chatId: meta.chatId,
        messageId: existing!.messageId,
        text,
        parseMode: 'HTML',
        replyMarkup,
      });
      if (!edited.ok && !isTelegramMessageNotModified(edited)) {
        throw new Error(edited.description ?? 'editMessageText failed');
      }
      messageId = existing!.messageId;
    } else {
      const sent = await sendTelegramBotMessage(opts.token, {
        chatId: meta.chatId,
        text,
        parseMode: 'HTML',
        messageThreadId: threadId,
        replyMarkup,
      });
      if (!sent.ok || sent.messageId == null) {
        throw new Error(sent.description ?? 'sendMessage failed');
      }
      messageId = sent.messageId;
      created = true;
    }
  }

  let pinned = false;
  if (opts.pin !== false) {
    const pin = await telegramApiCall(opts.token, 'pinChatMessage', {
      chat_id: meta.chatId,
      message_id: messageId,
      disable_notification: true,
    });
    pinned = pin.ok;
  }

  const next: SeatIntakeRecord = {
    ...record,
    desk: {
      chatId: meta.chatId,
      messageThreadId: threadId,
      messageId,
      updatedAt: new Date().toISOString(),
      ...(pinned ? { pinned: true } : {}),
    },
  };
  const intakePath = await saveSeatIntake(next, opts.intakeDir ?? SEAT_INTAKE_DIR);

  try {
    const db = openOperationsDb({
      path: Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH,
    });
    try {
      await ensurePartnerForumAccounting({
        db,
        token: opts.token,
        partnerCode: next.partnerCode,
        callSign: next.callSign,
        forumsMetaDir: opts.forumsMetaDir,
        intakeDir: opts.intakeDir,
        ensureTopics: true,
        postPrompt: true,
      });
    } finally {
      db.close();
    }
  } catch {
    /* desk publish must not fail when accounting topic bootstrap fails */
  }

  return {
    callSign: record.callSign,
    chatId: meta.chatId,
    messageThreadId: threadId,
    messageId,
    created,
    pinned,
    intakePath,
    renderMode,
  };
}

export async function pinSeatCapitalDesk(opts: {
  token: string;
  record: SeatIntakeRecord;
  intakeDir?: string;
}): Promise<boolean> {
  const desk = opts.record.desk;
  if (!desk?.messageId) throw new Error('No desk message_id — run post/refresh first');
  const pin = await telegramApiCall(opts.token, 'pinChatMessage', {
    chat_id: desk.chatId,
    message_id: desk.messageId,
    disable_notification: true,
  });
  if (pin.ok) {
    await saveSeatIntake(
      { ...opts.record, desk: { ...desk, pinned: true, updatedAt: new Date().toISOString() } },
      opts.intakeDir
    );
  }
  return pin.ok;
}

export async function unpinSeatCapitalDesk(opts: {
  token: string;
  record: SeatIntakeRecord;
  intakeDir?: string;
}): Promise<boolean> {
  const desk = opts.record.desk;
  if (!desk?.messageId) throw new Error('No desk message_id');
  const unpin = await telegramApiCall(opts.token, 'unpinChatMessage', {
    chat_id: desk.chatId,
    message_id: desk.messageId,
  });
  if (unpin.ok) {
    await saveSeatIntake(
      { ...opts.record, desk: { ...desk, pinned: false, updatedAt: new Date().toISOString() } },
      opts.intakeDir
    );
  }
  return unpin.ok;
}

export async function deleteSeatCapitalDesk(opts: {
  token: string;
  record: SeatIntakeRecord;
  intakeDir?: string;
}): Promise<boolean> {
  const desk = opts.record.desk;
  if (!desk?.messageId) throw new Error('No desk message_id');
  const del = await telegramApiCall(opts.token, 'deleteMessage', {
    chat_id: desk.chatId,
    message_id: desk.messageId,
  });
  if (del.ok) {
    const { desk: _removed, ...rest } = opts.record;
    await saveSeatIntake(rest, opts.intakeDir);
  }
  return del.ok;
}

/** Force new send (ignore stored message_id). */
export async function postSeatCapitalDesk(
  opts: PublishSeatCapitalDeskOpts & { forceNew?: boolean }
): Promise<PublishSeatCapitalDeskResult> {
  const record = opts.forceNew
    ? normalizeSeatIntake({ ...opts.record, desk: undefined })
    : opts.record;
  return publishSeatCapitalDesk({ ...opts, record });
}

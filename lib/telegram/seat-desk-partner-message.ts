/**
 * Partner-facing seat desk copy — field visibility manifest + message builders.
 *
 * Surfaces today:
 * - **Telegram pinned desk** — `buildSeatCapitalDeskRichBlocks` (table + FUND + Fill)
 * - **Copy buttons** — table / todo / reply line under desk
 * - **Partner paste message** — this module (`buildSeatDeskPartnerMessage`)
 * - **Liquidity/Outs thread prompts** — `buildSeatDeskTopicPrompt` (`topic-intake` · `topic-rails`)
 * - **Accounting thread prompt** — `buildSeatDeskAccountingTopicPrompt` (deposit/withdraw screenshots)
 *
 * Portal boards consume `summarizeSeatDeskPartnerView` via
 * `seat-capital-desk.json` → `partnerViews[]` (`ops:snapshot` bake).
 *
 * @see docs/harness/tenants/seat-capital-desk.md
 */
import {
  buildSeatDeskTableCopyReplyLine,
  isOutDeferred,
  listOutMissingFieldLabels,
  listOutTodoMissingFieldLabels,
  normalizeSeatIntake,
  outSequenceNumber,
  resolveFundStatus,
  SEAT_DESK_PIPE_FORMAT_LINES,
  type SeatIntakeRecord,
  type SeatOut,
} from './seat-intake.ts';
import { getSurface } from './surfaces.ts';

/** Where a desk field may appear (intake JSON always stores marked fields). */
export type SeatDeskFieldSurface =
  | 'intake'
  | 'deskTable'
  | 'deskDetail'
  | 'deskFund'
  | 'partnerMsg'
  | 'copyTable'
  | 'copyTodo'
  | 'fundGate'
  | 'internal';

export type SeatDeskFieldSpec = {
  /** Stored on `SeatOut` / record. */
  intake: boolean;
  /** Shown on partner-facing surfaces (table, msg, copy). */
  partnerVisible: boolean;
  /** Never sent to partners (passwords, ops overrides). */
  internal: boolean;
  /** Blocks auto FUND / STATUS when empty. */
  fundGate: boolean;
  /** Human label in partner todo / paste messages. */
  partnerLabel?: string;
  surfaces: SeatDeskFieldSurface[];
};

/**
 * Field visibility SSOT — drives desk table, rich details, copy helpers, and partner paste.
 * Code paths should align with this map when adding columns or message lines.
 */
export const SEAT_DESK_FIELD_MANIFEST: Record<string, SeatDeskFieldSpec> = {
  book: {
    intake: true,
    partnerVisible: true,
    internal: false,
    fundGate: false,
    partnerLabel: 'book',
    surfaces: ['intake', 'deskTable', 'partnerMsg', 'copyTable'],
  },
  bookLogin: {
    intake: true,
    partnerVisible: true,
    internal: false,
    fundGate: true,
    partnerLabel: 'book login',
    surfaces: ['intake', 'deskTable', 'partnerMsg', 'copyTable', 'copyTodo', 'fundGate'],
  },
  password: {
    intake: true,
    partnerVisible: false,
    internal: true,
    fundGate: false,
    surfaces: ['intake', 'internal'],
  },
  paymentRail: {
    intake: true,
    partnerVisible: true,
    internal: false,
    fundGate: true,
    partnerLabel: 'deposit method',
    surfaces: ['intake', 'deskTable', 'partnerMsg', 'copyTable', 'copyTodo', 'fundGate'],
  },
  sendTo: {
    intake: true,
    partnerVisible: true,
    internal: false,
    fundGate: true,
    partnerLabel: 'send-to',
    surfaces: ['intake', 'deskTable', 'partnerMsg', 'copyTable', 'copyTodo', 'fundGate'],
  },
  maxBet: {
    intake: true,
    partnerVisible: true,
    internal: false,
    fundGate: false,
    partnerLabel: 'max bet',
    surfaces: ['intake', 'deskTable', 'partnerMsg', 'copyTable', 'copyTodo'],
  },
  freeplay: {
    intake: true,
    partnerVisible: true,
    internal: false,
    fundGate: false,
    partnerLabel: 'freeplay % on deposit',
    surfaces: ['intake', 'deskTable', 'partnerMsg', 'copyTable', 'copyTodo'],
  },
  balance: {
    intake: true,
    partnerVisible: false,
    internal: false,
    fundGate: false,
    surfaces: ['intake', 'deskDetail'],
  },
  withdrawPath: {
    intake: true,
    partnerVisible: false,
    internal: false,
    fundGate: false,
    surfaces: ['intake', 'deskDetail'],
  },
  note: {
    intake: true,
    partnerVisible: false,
    internal: false,
    fundGate: false,
    surfaces: ['intake', 'deskDetail'],
  },
  deskStatus: {
    intake: true,
    partnerVisible: true,
    internal: false,
    fundGate: false,
    partnerLabel: 'status',
    surfaces: ['intake', 'deskTable', 'partnerMsg'],
  },
  fundStatus: {
    intake: true,
    partnerVisible: false,
    internal: false,
    fundGate: false,
    surfaces: ['intake', 'deskFund', 'internal'],
  },
};

export type SeatDeskPartnerOutRow = {
  num: string;
  outId: string; // brand-ok — seat out token
  book: string;
  username: string;
  /** Fund-flow gaps (username, deposit method, send-to). */
  missingFund: string[];
  /** Book-term gaps (max bet, freeplay %) — also in copy todo. */
  missingBookTerms: string[];
  /** Full todo list (fund + book terms). */
  missingAll: string[];
  deferred: boolean;
  complete: boolean;
};

export type SeatDeskPartnerView = {
  callSign: string;
  partnerCode: string;
  fund: ReturnType<typeof resolveFundStatus>;
  activeOuts: SeatDeskPartnerOutRow[];
  deferredOuts: SeatDeskPartnerOutRow[];
  /** Shared missing labels across all active outs (for consolidated partner copy). */
  commonMissing: string[];
  /** Labels only some outs need (e.g. out 3 username only). */
  outSpecificMissing: Array<{ num: string; book: string; labels: string[] }>;
};

function bookLabel(out: SeatOut): string {
  return (out.book ?? out.url ?? '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '');
}

function outUsername(out: SeatOut): string {
  return (out.bookLogin ?? out.user)?.trim() || '—';
}

function partnerLabel(raw: string): string {
  const map: Record<string, string> = {
    username: 'book login',
    'deposit method': 'deposit method',
    'send-to': 'send-to',
    max: 'max bet',
    'fp%': 'freeplay % on deposit',
  };
  return map[raw] ?? raw;
}

function rowFromOut(
  out: SeatOut,
  index: number,
  defRail?: string,
  defSend?: string
): SeatDeskPartnerOutRow {
  const missingFund = listOutMissingFieldLabels(out, defRail, defSend).map(partnerLabel);
  const missingAll = listOutTodoMissingFieldLabels(out, defRail, defSend).map(partnerLabel);
  const missingBookTerms = missingAll.filter(l => !missingFund.includes(l));
  const deferred = isOutDeferred(out);
  return {
    num: outSequenceNumber(index),
    outId: out.outId ?? '',
    book: bookLabel(out),
    username: outUsername(out),
    missingFund,
    missingBookTerms,
    missingAll,
    deferred,
    complete: missingAll.length === 0 && !deferred,
  };
}

/** JSON-friendly snapshot for CLI, tests, and future dashboard panels. */
export function summarizeSeatDeskPartnerView(record: SeatIntakeRecord): SeatDeskPartnerView {
  const hydrated = normalizeSeatIntake(record);
  const defRail = hydrated.defaultPaymentRail?.trim();
  const defSend = hydrated.defaultSendTo?.trim();
  const fund = resolveFundStatus(hydrated);
  const rows = hydrated.outs.map((out, i) => rowFromOut(out, i, defRail, defSend));

  const activeOuts = rows.filter(r => !r.deferred);
  const deferredOuts = rows.filter(r => r.deferred);

  const labelSets = activeOuts.map(r => new Set(r.missingAll));
  const commonMissing =
    labelSets.length === 0
      ? []
      : [...labelSets[0]!].filter(label => labelSets.every(s => s.has(label)));

  const outSpecificMissing = activeOuts
    .filter(r => r.missingAll.some(l => !commonMissing.includes(l)))
    .map(r => ({
      num: r.num,
      book: r.book,
      labels: r.missingAll.filter(l => !commonMissing.includes(l)),
    }));

  return {
    callSign: hydrated.callSign,
    partnerCode: hydrated.partnerCode,
    fund,
    activeOuts,
    deferredOuts,
    commonMissing,
    outSpecificMissing,
  };
}

export type SeatDeskPartnerMessageTemplate =
  | 'confirm-active'
  | 'todo'
  | 'reply-hint'
  | 'topic-intake'
  | 'topic-rails'
  | 'topic-accounting';

export type SeatDeskPartnerMessageThread =
  | 'dm-paste'
  | 'desk-copy'
  | 'liquidity/outs'
  | 'accounting'
  | 'all-accounting';

export type SeatDeskPartnerMessageTemplateSpec = {
  id: SeatDeskPartnerMessageTemplate;
  label: string;
  thread: SeatDeskPartnerMessageThread;
  purpose: string;
  cli: string;
  /** `--post` supported (Telegram send). */
  postable: boolean;
  /** Intake-driven fields interpolated into copy. */
  dynamicFields: readonly string[];
};

/**
 * Partner / forum message template SSOT — docs and CLI must align with this map.
 * Builders: `buildSeatDeskPartnerMessage` · `buildSeatDeskTopicPrompt` · `buildPartnerAccountingTopicPrompt`.
 */
export const SEAT_DESK_PARTNER_MESSAGE_TEMPLATES: Record<
  SeatDeskPartnerMessageTemplate,
  SeatDeskPartnerMessageTemplateSpec
> = {
  'confirm-active': {
    id: 'confirm-active',
    label: 'Partner confirm (DM paste)',
    thread: 'dm-paste',
    purpose: 'Consolidated active-out confirm + missing fields + reply examples.',
    cli: 'bun run seat:desk:partner-message CALL-SIGN',
    postable: false,
    dynamicFields: [
      'callSign',
      'activeOutCount',
      'deferredOuts',
      'commonMissing',
      'outSpecificMissing',
    ],
  },
  todo: {
    id: 'todo',
    label: 'Todo list',
    thread: 'desk-copy',
    purpose: 'One line per incomplete out — mirrors Copy todo button.',
    cli: 'bun run seat:desk:partner-message CALL-SIGN --template todo',
    postable: false,
    dynamicFields: ['perOutMissing'],
  },
  'reply-hint': {
    id: 'reply-hint',
    label: 'Reply hint line',
    thread: 'desk-copy',
    purpose: 'Single pipe line for first incomplete out.',
    cli: 'bun run seat:desk:partner-message CALL-SIGN --template reply-hint',
    postable: false,
    dynamicFields: ['firstIncompleteOutNum'],
  },
  'topic-intake': {
    id: 'topic-intake',
    label: 'Liquidity/Outs · deposit rails',
    thread: 'liquidity/outs',
    purpose: 'First rails ask on pinned desk — pipe format + no-password note.',
    cli: 'bun run seat:desk:partner-message CALL-SIGN --template topic-intake [--post]',
    postable: true,
    dynamicFields: ['partnerCode', 'deskPin', 'activeOutRange', 'deferredSkip'],
  },
  'topic-rails': {
    id: 'topic-rails',
    label: 'Liquidity/Outs · pay rails nudge',
    thread: 'liquidity/outs',
    purpose: 'Short follow-up when rails still missing on desk.',
    cli: 'bun run seat:desk:partner-message CALL-SIGN --template topic-rails [--post]',
    postable: true,
    dynamicFields: ['partnerCode', 'deskPin', 'railsNeedLine', 'deferredSkip'],
  },
  'topic-accounting': {
    id: 'topic-accounting',
    label: 'Accounting · proof thread',
    thread: 'accounting',
    purpose: 'Deposit/withdraw screenshots + optional bet slips — not parsed by desk pipe.',
    cli: 'bun run seat:desk:accounting-prompt CALL-SIGN [--post] [--thread-id N]',
    postable: true,
    dynamicFields: ['partnerCode', 'deskPin', 'activeOutRange', 'deferredSkip'],
  },
};

/** House cross-partner rollup channel (not a seat-desk partner template). */
export const ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC = {
  id: 'all-accounting-channel',
  label: 'TOC Ops · all accounting',
  thread: 'all-accounting' as const,
  purpose: 'Ops rollup — partners post in package forum Accounting; ops mirror here.',
  cli: 'bun run telegram:all-accounting --chat CHAT_ID --brand --post-prompt',
  forumTopics: ['Deposits', 'Withdrawals', 'Reconcile'],
  builder: 'buildAllAccountingChannelPrompt',
} as const;

/** House forum General-topic welcome prompts (hq · sandbox). */
export const HOUSE_FORUM_WELCOME_TEMPLATE_SPECS = [
  {
    surfaceSlug: 'hq' as const,
    id: 'house-hq-welcome',
    label: 'TOC Ops · HQ',
    builder: 'buildHouseForumWelcomePrompt',
    cli: 'bun tools/house-forum-channel.ts hq --post-prompt',
  },
  {
    surfaceSlug: 'sandbox' as const,
    id: 'house-sandbox-welcome',
    label: 'TOC Ops · sandbox',
    builder: 'buildHouseForumWelcomePrompt',
    cli: 'bun tools/house-forum-channel.ts sandbox --post-prompt',
  },
] as const;

export type SeatDeskTopicPromptKind = 'topic-intake' | 'topic-rails';

export type SeatDeskAccountingTopicPromptKind = 'topic-accounting';

export type BuildSeatDeskPartnerMessageOpts = {
  template?: SeatDeskPartnerMessageTemplate;
  /** Opening line — default references call-sign. */
  greeting?: string;
  /** Include Fill / Copy todo hint (default true for confirm-active). */
  includeDeskHint?: boolean;
};

function formatBookRollup(active: SeatDeskPartnerOutRow[]): string {
  return active
    .map(o => {
      const user = o.username === '—' ? o.book : `${o.book} (${o.username})`;
      return user;
    })
    .join(' · ');
}

function deskPinRef(record: SeatIntakeRecord): string {
  const id = record.desk?.messageId;
  return id ? `#${id}` : 'pinned desk';
}

function activeOutRangeLabel(view: SeatDeskPartnerView): string {
  if (!view.activeOuts.length) return 'no active outs';
  const nums = view.activeOuts.map(o => Number.parseInt(o.num, 10));
  if (nums.some(n => Number.isNaN(n))) {
    return view.activeOuts.map(o => `out ${o.num}`).join(', ');
  }
  if (nums.length === 1) return `out ${nums[0]}`;

  const runs: Array<[number, number]> = [];
  let start = nums[0]!;
  let prev = nums[0]!;
  for (let i = 1; i < nums.length; i++) {
    const n = nums[i]!;
    if (n === prev + 1) prev = n;
    else {
      runs.push([start, prev]);
      start = n;
      prev = n;
    }
  }
  runs.push([start, prev]);

  const formatted = runs.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ');
  return `outs ${formatted}`;
}

function deferredSkipLine(view: SeatDeskPartnerView): string | null {
  if (!view.deferredOuts.length) return null;
  const nums = view.deferredOuts.map(o => o.num).join(', ');
  return `Out ${nums} deferred — skip.`;
}

function formatDeferredNote(deferred: SeatDeskPartnerOutRow[]): string | null {
  if (!deferred.length) return null;
  if (deferred.length === 1) {
    const o = deferred[0]!;
    return `**${o.book} (out ${o.num})** deferred — skipping for this batch.`;
  }
  const roll = deferred.map(o => `${o.book} (out ${o.num})`).join(', ');
  return `**Deferred:** ${roll}.`;
}

function topicRailsNeedLine(view: SeatDeskPartnerView): string {
  const needMethod = view.activeOuts.some(o => o.missingFund.includes('deposit method'));
  const needSend = view.activeOuts.some(o => o.missingFund.includes('send-to'));
  if (!needMethod && !needSend) {
    return 'Deposit method + send-to look complete on the desk — reply if anything is wrong:';
  }
  if (needMethod && needSend) return 'Still need deposit method + send-to:';
  if (needMethod) return 'Still need deposit method:';
  return 'Still need send-to:';
}

/** Short Liquidity/Outs thread prompt — replaces verbose manual TOC Ops posts. */
export function buildSeatDeskTopicPrompt(
  record: SeatIntakeRecord,
  kind: SeatDeskTopicPromptKind
): string {
  const view = summarizeSeatDeskPartnerView(record);
  const pin = deskPinRef(record);
  const code = view.partnerCode.toUpperCase();
  const deferred = deferredSkipLine(view);
  const replyFmt = [...SEAT_DESK_PIPE_FORMAT_LINES];

  if (kind === 'topic-intake') {
    const lines = [
      `${code} · deposit rails · desk ${pin}`,
      '',
      ...(deferred ? [deferred, ''] : []),
      `Reply one line per out (${activeOutRangeLabel(view)}), or DEFAULT for all:`,
      ...replyFmt,
      '',
      'No book passwords here — desk updates in place.',
    ];
    return lines.join('\n');
  }

  return [
    `${code} · pay rails · desk ${pin}`,
    '',
    ...(deferred ? [deferred, ''] : []),
    topicRailsNeedLine(view),
    ...replyFmt,
  ].join('\n');
}

/** Accounting forum topic — deposit/withdraw/bet proof (screenshots), not desk setup. */
export function buildSeatDeskAccountingTopicPrompt(record: SeatIntakeRecord): string {
  const view = summarizeSeatDeskPartnerView(record);
  return buildPartnerAccountingTopicPrompt(view.partnerCode, {
    deferredLine: deferredSkipLine(view),
    activeOutRange: view.activeOuts.length ? activeOutRangeLabel(view) : null,
    deskPin: deskPinRef(record),
  });
}

/** Partner-level accounting prompt when no seat intake JSON exists yet. */
export function buildPartnerAccountingTopicPrompt(
  partnerCode: string,
  opts: {
    deferredLine?: string | null;
    activeOutRange?: string | null;
    deskPin?: string;
  } = {}
): string {
  const code = partnerCode.toUpperCase().trim();
  const deferred = opts.deferredLine ?? null;
  const range = opts.activeOutRange ?? 'active outs';
  const deskPin = opts.deskPin ?? 'pinned desk';

  return [
    `${code} · accounting`,
    '',
    ...(deferred ? [deferred, ''] : []),
    'Deposit + withdraw screenshots here — one event per message.',
    `Tag out # when you can (${range}): out 2 · $500 Venmo deposit`,
    '',
    'Bet slips OK when reconciling a book balance.',
    '',
    `Rails / send-to → Liquidity/Outs desk ${deskPin}.`,
    'No book passwords on this thread.',
  ].join('\n');
}

/** House `all-accounting` channel — cross-partner rollup (ops-facing). */
export function buildAllAccountingChannelPrompt(): string {
  return [
    'TOC Ops · all accounting',
    '',
    'Cross-partner deposit/withdraw proof rollup.',
    'Partners post screenshots in their package forum · Accounting topic.',
    'Ops mirror or escalate here when needed.',
    '',
    'Topics: Deposits · Withdrawals · Reconcile',
  ].join('\n');
}

/** House forum General-topic welcome — hq, sandbox, all-accounting. */
export function buildHouseForumWelcomePrompt(surfaceSlug: string): string | null {
  const slug = surfaceSlug.trim().toLowerCase();
  if (slug === 'all-accounting') return buildAllAccountingChannelPrompt();

  const surface = getSurface(slug);
  if (!surface) return null;

  const topicLine =
    surface.topics.length > 0
      ? `Topics: ${surface.topics.map(t => t.replace(/-/g, ' ')).join(' · ')}`
      : '';

  if (slug === 'hq') {
    return [
      'TOC Ops · HQ',
      '',
      surface.purpose,
      '',
      'Post alerts and day-ops here — not partner package traffic.',
      topicLine,
      '',
      'Partner desks live in package forums (Liquidity/Outs + Accounting).',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (slug === 'sandbox') {
    return [
      'TOC Ops · sandbox',
      '',
      surface.purpose,
      '',
      'Use scratch / experiments topics only.',
      topicLine,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return null;
}

/**
 * Plain-text partner paste (Telegram-friendly — minimal markdown).
 * Source new copy from `summarizeSeatDeskPartnerView` + this builder instead of hand-writing.
 */
export function buildSeatDeskPartnerMessage(
  record: SeatIntakeRecord,
  opts: BuildSeatDeskPartnerMessageOpts = {}
): string {
  const template = opts.template ?? 'confirm-active';

  if (template === 'reply-hint') {
    return buildSeatDeskTableCopyReplyLine(record);
  }

  if (template === 'topic-intake') {
    return buildSeatDeskTopicPrompt(record, 'topic-intake');
  }

  if (template === 'topic-rails') {
    return buildSeatDeskTopicPrompt(record, 'topic-rails');
  }

  if (template === 'topic-accounting') {
    return buildSeatDeskAccountingTopicPrompt(record);
  }

  const view = summarizeSeatDeskPartnerView(record);

  if (template === 'todo') {
    const lines = [`${view.callSign} todos`];
    for (const o of view.activeOuts) {
      if (o.complete) continue;
      lines.push(`out ${o.num} need ${o.missingAll.join(', ')}`);
    }
    if (lines.length === 1) lines.push('all active outs complete');
    for (const o of view.deferredOuts) {
      lines.push(`out ${o.num} deferred`);
    }
    return lines.join('\n');
  }

  const activeCount = view.activeOuts.length;
  const greeting =
    opts.greeting ??
    `Hey — confirming **${view.callSign}**: we're using **${activeCount} out${activeCount === 1 ? '' : 's'}** for now.`;

  const parts: string[] = [greeting];

  const deferredNote = formatDeferredNote(view.deferredOuts);
  if (deferredNote) parts.push('', deferredNote);

  if (view.activeOuts.length) {
    parts.push('', `**Active books:** ${formatBookRollup(view.activeOuts)}`);
  }

  if (view.commonMissing.length || view.outSpecificMissing.length) {
    parts.push('');
    if (view.commonMissing.length) {
      parts.push(`**Still need on each active out:** ${view.commonMissing.join(', ')}.`);
    }
    for (const spec of view.outSpecificMissing) {
      parts.push(`**Out ${spec.num} only (${spec.book}):** ${spec.labels.join(', ')}.`);
    }
  } else if (view.activeOuts.length) {
    parts.push('', '**All active outs complete** on the fields we track.');
  }

  parts.push(
    '',
    'Reply one line per out, e.g.',
    '`1 | Venmo | @handle | $500 max | 100% fp`',
    '`2 | …`',
    '`3 | username | …`',
    '`4 | …`'
  );

  if (opts.includeDeskHint !== false) {
    parts.push('', 'Or use **Fill** / **Copy todo** on the pinned desk.');
  }

  return parts.join('\n');
}

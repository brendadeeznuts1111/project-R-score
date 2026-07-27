#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
/**
 * Seat capital desk lifecycle — one pinned Telegram message per call-sign.
 *
 *   bun tools/seat-desk-cli.ts post SPEN-001
 *   bun tools/seat-desk-cli.ts refresh SPEN-001
 *   bun tools/seat-desk-cli.ts update SPEN-001 --field SPEN-1.rail=Venmo --field SPEN-1.sendTo=@handle
 *   bun tools/seat-desk-cli.ts pin SPEN-001
 *   bun tools/seat-desk-cli.ts unpin SPEN-001
 *   bun tools/seat-desk-cli.ts delete SPEN-001
 *   bun tools/seat-desk-cli.ts partner-message SPEN-001 --template topic-intake [--post]
 *   bun tools/seat-desk-cli.ts topic-prompts SPEN-001
 */
import { registerPackageGroupForumTopic } from '../lib/telegram/package-group-forum.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import {
  applyHarnessStagingRails,
  applyIntakeField,
  deleteSeatCapitalDesk,
  loadSeatIntake,
  pinSeatCapitalDesk,
  postSeatCapitalDesk,
  postSeatDeskAccountingThreadMessage,
  postSeatDeskLiquidityThreadMessage,
  publishSeatCapitalDesk,
  resolveFundStatus,
  saveSeatIntake,
  unpinSeatCapitalDesk,
} from '../lib/telegram/seat-capital-desk.ts';
import {
  buildSeatDeskAccountingTopicPrompt,
  buildSeatDeskPartnerMessage,
  buildSeatDeskTopicPrompt,
  summarizeSeatDeskPartnerView,
  type SeatDeskTopicPromptKind,
} from '../lib/telegram/seat-desk-partner-message.ts';

const TOPIC_TEMPLATES = ['topic-intake', 'topic-rails', 'topic-accounting'] as const;
type TopicTemplate = (typeof TOPIC_TEMPLATES)[number];

type PartnerTemplate = 'confirm-active' | 'todo' | 'reply-hint' | TopicTemplate;

function isTopicPostTemplate(t: PartnerTemplate): t is TopicTemplate {
  return TOPIC_TEMPLATES.includes(t as TopicTemplate);
}

function usage(): never {
  console.log(`Usage:
  bun tools/seat-desk-cli.ts post <CALL-SIGN> [--force-new] [--no-pin]
  bun tools/seat-desk-cli.ts refresh <CALL-SIGN> [--no-pin]
  bun tools/seat-desk-cli.ts update <CALL-SIGN> --field key=value [--field …] [--no-publish]
  bun tools/seat-desk-cli.ts pin <CALL-SIGN>
  bun tools/seat-desk-cli.ts unpin <CALL-SIGN>
  bun tools/seat-desk-cli.ts delete <CALL-SIGN>
  bun tools/seat-desk-cli.ts partner-message <CALL-SIGN> [--json] [--template confirm-active|todo|reply-hint|topic-intake|topic-rails|topic-accounting] [--post]
  bun tools/seat-desk-cli.ts topic-prompts <CALL-SIGN> [--intake-only|--rails-only]
  bun tools/seat-desk-cli.ts accounting-prompt <CALL-SIGN> [--post] [--thread-id N]
  bun tools/seat-desk-cli.ts harness-rails <CALL-SIGN> [CALL-SIGN…] [--no-publish]`);
  process.exit(1);
}

function isPartnerTemplate(t: string | undefined): t is PartnerTemplate {
  return (
    t === 'confirm-active' ||
    t === 'todo' ||
    t === 'reply-hint' ||
    t === 'topic-intake' ||
    t === 'topic-rails' ||
    t === 'topic-accounting'
  );
}

const argv = Bun.argv.slice(2);
const command = argv[0];
const callSign = argv[1]?.toUpperCase().trim();
if (!command || command === '--help' || command === '-h') usage();
if (command !== 'harness-rails' && !callSign) usage();

let pin = true;
let forceNew = false;
let publish = true;
let partnerJson = false;
let partnerPost = false;
let topicIntakeOnly = false;
let topicRailsOnly = false;
let accountingThreadId: number | null = null;
let partnerTemplate: PartnerTemplate = 'confirm-active';
const fields: string[] = [];

for (let i = 2; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--no-pin') pin = false;
  else if (a === '--force-new') forceNew = true;
  else if (a === '--no-publish') publish = false;
  else if (a === '--json') partnerJson = true;
  else if (a === '--post') partnerPost = true;
  else if (a === '--intake-only') topicIntakeOnly = true;
  else if (a === '--rails-only') topicRailsOnly = true;
  else if (a === '--thread-id') {
    const n = Number.parseInt(argv[++i] ?? '', 10);
    if (Number.isFinite(n) && n > 0) accountingThreadId = n;
  } else if (a.startsWith('--thread-id=')) {
    const n = Number.parseInt(a.slice('--thread-id='.length), 10);
    if (Number.isFinite(n) && n > 0) accountingThreadId = n;
  } else if (a === '--template') {
    const t = argv[++i];
    if (isPartnerTemplate(t)) partnerTemplate = t;
  } else if (a.startsWith('--template=')) {
    const t = a.slice('--template='.length);
    if (isPartnerTemplate(t)) partnerTemplate = t;
  } else if (a === '--field') {
    const v = argv[++i];
    if (v && !v.startsWith('-')) fields.push(v);
  } else if (a.startsWith('--field=')) {
    fields.push(a.slice('--field='.length));
  }
}

if (topicIntakeOnly && topicRailsOnly) {
  console.error('Use --intake-only or --rails-only, not both');
  process.exit(1);
}

const tg = loadTelegramEnv();

if (command === 'harness-rails') {
  const callSigns: string[] = [];
  let harnessPublish = true;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--no-publish') harnessPublish = false;
    else if (!a.startsWith('-')) callSigns.push(a.toUpperCase().trim());
  }
  if (callSigns.length === 0) {
    console.error(
      'Usage: bun tools/seat-desk-cli.ts harness-rails CALL-SIGN [CALL-SIGN…] [--no-publish]'
    );
    process.exit(1);
  }
  if (harnessPublish && !tg.effectiveToken) {
    console.error('TELEGRAM_BOT_FACTORY token missing');
    process.exit(1);
  }
  for (const cs of callSigns) {
    let intake = await loadSeatIntake(cs);
    if (!intake) {
      console.error(`skip ${cs}: no intake file`);
      continue;
    }
    const before = resolveFundStatus(intake);
    intake = applyHarnessStagingRails(intake);
    const after = resolveFundStatus(intake);
    const path = await saveSeatIntake(intake);
    console.log(`${cs}: ${before.status} → ${after.status} · ${after.detail}`);
    console.log(`  saved: ${path}`);
    if (harnessPublish) {
      const result = await publishSeatCapitalDesk({
        token: tg.effectiveToken!,
        record: intake,
        pin: true,
      });
      console.log(`  desk: updated #${result.messageId} · thread ${result.messageThreadId}`);
    }
  }
  process.exit(0);
}

let record = await loadSeatIntake(callSign);
if (!record) {
  console.error(`No intake: reports/telegram/seat-intake/${callSign}.json`);
  process.exit(1);
}

const needToken =
  (command === 'partner-message' && partnerPost) ||
  (command === 'accounting-prompt' && partnerPost) ||
  command === 'topic-prompts' ||
  (command !== 'update' && command !== 'partner-message' && command !== 'accounting-prompt') ||
  (command === 'update' && publish);
if (needToken && !tg.effectiveToken) {
  console.error('TELEGRAM_BOT_FACTORY token missing');
  process.exit(1);
}

async function postTopicPrompt(kind: SeatDeskTopicPromptKind): Promise<void> {
  const text = buildSeatDeskTopicPrompt(record, kind);
  console.log(text);
  console.log('');
  const result = await postSeatDeskLiquidityThreadMessage({
    token: tg.effectiveToken!,
    record,
    text,
  });
  if (!result.ok || result.messageId == null) {
    console.error(`post failed: ${result.description ?? 'unknown'}`);
    process.exit(1);
  }
  console.log(
    `posted ${kind} #${result.messageId} · chat ${result.chatId} · thread ${result.messageThreadId}`
  );
}

async function postAccountingPrompt(): Promise<void> {
  if (accountingThreadId != null) {
    const reg = await registerPackageGroupForumTopic(
      record.partnerCode,
      'Accounting',
      accountingThreadId
    );
    console.log(`registered Accounting topic thread ${accountingThreadId} → ${reg.path}`);
  }
  const text = buildSeatDeskAccountingTopicPrompt(record);
  console.log(text);
  console.log('');
  const result = await postSeatDeskAccountingThreadMessage({
    token: tg.effectiveToken!,
    record,
    text,
  });
  if (!result.ok || result.messageId == null) {
    console.error(`post failed: ${result.description ?? 'unknown'}`);
    process.exit(1);
  }
  console.log(
    `posted topic-accounting #${result.messageId} · chat ${result.chatId} · thread ${result.messageThreadId}`
  );
}

switch (command) {
  case 'post': {
    const result = await postSeatCapitalDesk({
      token: tg.effectiveToken!,
      record,
      pin,
      forceNew,
    });
    printPublish(result);
    break;
  }
  case 'refresh': {
    const result = await publishSeatCapitalDesk({
      token: tg.effectiveToken!,
      record,
      pin,
    });
    printPublish(result);
    break;
  }
  case 'update': {
    if (fields.length === 0) {
      console.error('update requires --field key=value (repeatable)');
      process.exit(1);
    }
    for (const f of fields) {
      record = applyIntakeField(record, f);
      console.log(`applied ${f}`);
    }
    const path = await saveSeatIntake(record);
    console.log(`saved: ${path}`);
    if (!publish) break;
    const result = await publishSeatCapitalDesk({
      token: tg.effectiveToken!,
      record,
      pin: false,
    });
    printPublish(result);
    break;
  }
  case 'pin': {
    const ok = await pinSeatCapitalDesk({ token: tg.effectiveToken!, record });
    console.log(ok ? `pinned desk #${record.desk?.messageId}` : 'pin failed (bot may lack right)');
    break;
  }
  case 'unpin': {
    const ok = await unpinSeatCapitalDesk({ token: tg.effectiveToken!, record });
    console.log(ok ? `unpinned desk #${record.desk?.messageId}` : 'unpin failed');
    break;
  }
  case 'delete': {
    const ok = await deleteSeatCapitalDesk({ token: tg.effectiveToken!, record });
    console.log(ok ? 'desk message deleted; metadata cleared' : 'delete failed');
    break;
  }
  case 'accounting-prompt': {
    if (accountingThreadId != null && !partnerPost) {
      const reg = await registerPackageGroupForumTopic(
        record.partnerCode,
        'Accounting',
        accountingThreadId
      );
      console.log(`registered Accounting topic thread ${accountingThreadId} → ${reg.path}`);
      break;
    }
    const text = buildSeatDeskAccountingTopicPrompt(record);
    if (!partnerPost) {
      console.log(text);
      break;
    }
    await postAccountingPrompt();
    break;
  }
  case 'topic-prompts': {
    const kinds: SeatDeskTopicPromptKind[] = topicRailsOnly
      ? ['topic-rails']
      : topicIntakeOnly
        ? ['topic-intake']
        : ['topic-intake', 'topic-rails'];
    for (const kind of kinds) {
      await postTopicPrompt(kind);
      if (kinds.length > 1 && kind === 'topic-intake') {
        await Bun.sleep(400);
      }
    }
    break;
  }
  case 'partner-message': {
    if (partnerJson) {
      console.log(JSON.stringify(summarizeSeatDeskPartnerView(record), null, 2));
      break;
    }
    const text = buildSeatDeskPartnerMessage(record, { template: partnerTemplate });
    if (!partnerPost) {
      console.log(text);
      break;
    }
    if (!isTopicPostTemplate(partnerTemplate)) {
      console.error(
        '--post is only supported for --template topic-intake, topic-rails, or topic-accounting'
      );
      process.exit(1);
    }
    console.log(text);
    console.log('');
    if (partnerTemplate === 'topic-accounting') {
      const result = await postSeatDeskAccountingThreadMessage({
        token: tg.effectiveToken!,
        record,
        text,
      });
      if (!result.ok || result.messageId == null) {
        console.error(`post failed: ${result.description ?? 'unknown'}`);
        process.exit(1);
      }
      console.log(
        `posted #${result.messageId} · chat ${result.chatId} · thread ${result.messageThreadId}`
      );
      break;
    }
    const result = await postSeatDeskLiquidityThreadMessage({
      token: tg.effectiveToken!,
      record,
      text,
    });
    if (!result.ok || result.messageId == null) {
      console.error(`post failed: ${result.description ?? 'unknown'}`);
      process.exit(1);
    }
    console.log(
      `posted #${result.messageId} · chat ${result.chatId} · thread ${result.messageThreadId}`
    );
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    usage();
}

function printPublish(result: {
  callSign: string;
  messageId: number;
  chatId: string; // brand-ok — Telegram chat_id wire
  messageThreadId: number;
  created: boolean;
  pinned: boolean;
  intakePath: string;
  renderMode?: string;
}): void {
  console.log(
    `${result.callSign} capital desk · ${result.created ? 'posted' : 'updated'} #${result.messageId} (${result.renderMode ?? 'legacy'})`
  );
  console.log(`  chat: ${result.chatId}  thread: ${result.messageThreadId}`);
  console.log(`  pinned: ${result.pinned ? 'yes' : 'no'}`);
  console.log(`  intake: ${result.intakePath}`);
}

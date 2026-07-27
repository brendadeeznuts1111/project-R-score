#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --deep
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram ops CLI — send broadcasts + chat directory.
 *
 *   bun run telegram:ops -- send --all "Deploy complete"
 *   bun run telegram:ops -- send --chat -100123 "ping"
 *   bun run telegram:ops -- send --kind group --all --preview "hello {{title}}"
 *   bun run telegram:ops -- directory
 *   bun run telegram:ops -- directory --refresh
 *   bun run telegram:ops -- surfaces
 *   bun run telegram:ops -- graph
 *   bun run telegram:ops -- graph --mermaid
 *   bun run telegram:ops -- link-package-group ASH -1003937534779 --invite 'https://t.me/+…'
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import {
  broadcastToKnownChats,
  enqueueBroadcastToOutbox,
  formatBroadcastSummary,
  resolveBroadcastTargets,
} from '../lib/telegram/broadcast.ts';
import {
  buildKnownChatDirectoryExtras,
  formatKnownChatsTable,
  listKnownChats,
  type KnownChatFilterKind,
} from '../lib/telegram/known-chats.ts';
import { listPackageGroupRegistry } from '../lib/telegram/package-group-registry.ts';
import { refreshKnownChats } from '../lib/telegram/refresh-known-chats.ts';
import { loadReasonixEnv } from '../lib/telegram/catalog-research/load-reasonix-env.ts';
import { syncTelegramEnvToReasonix } from '../lib/telegram/telegram-env-bind.ts';
import {
  buildSurfaceGraph,
  formatSurfaceGraphAscii,
  formatSurfaceGraphEnvBlock,
  formatSurfaceGraphMermaid,
} from '../lib/telegram/surface-graph.ts';
import { formatSurfaceMatrix, loadTelegramSurfacesMap } from '../lib/telegram/surfaces.ts';
import {
  resolvePartnerDmTelegramId,
  upsertPackageGroupRegistry,
  appendAckPackageGroupLinked,
  appendAckDmSeatDesignated,
  getPackageGroupRegistry,
  parsePartnerCode,
  parseTelegramChatIdWire,
  resolvePackageGroupDisplayName,
} from '../lib/telegram/package-group-registry.ts';
import {
  formatPackageGroupTopicsHandoff,
  loadPackageGroupForumMetadata,
} from '../lib/telegram/package-group-forum.ts';
import {
  designatePackageGroupDmSeat,
  assessPackageGroupDmSeat,
  formatDmSeatStatus,
} from '../lib/telegram/dm-seat-designation.ts';
import {
  assessHandshakeReadiness,
  formatHandshakeReadinessDetail,
  formatHandshakeReadinessTable,
} from '../lib/telegram/handshake-readiness.ts';
import {
  sendForumInviteDm,
  sendForumInviteDmsForGaps,
  formatForumInviteDmText,
} from '../lib/telegram/forum-invite-gap.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import {
  buildPartnerPackageMap,
  buildSeatTelegramMap,
  formatPartnerPackageMapTable,
  formatSeatTelegramMapTable,
  resolveFlowNodeForTelegram,
  setActiveCallSignForTelegram,
} from '../lib/telegram/flows/seat-telegram.ts';
import { sendTelegramBotMessage } from '../lib/telegram/telegram-api.ts';

function usage(): never {
  console.log(`Usage: bun tools/telegram-ops.ts <command> [options]

Commands:
  send        Broadcast text to known chats
  directory   Print known-chats table (ID / title / type / active / last seen)
  surfaces    Concern matrix + naming grammar (+ TELEGRAM_SURFACES bindings)
  graph       Live concern topology (ASCII; --mermaid; --env for .env block)
  link-package-group  Bind partner package forum chat_id (+ optional DM)
  designate-dm-seat   Acknowledge operator seat before Telegram id exists
  send-forum-invite   DM linked operator with registry forum invite (2·house!)
  readiness           E2E phased gates (forum → designated → operator linked)
  seat-map            Seat ↔ Telegram ↔ package forum mapping
  acknowledge-pending Mark factory linked ack on JSONL event log

link-package-group:
  <CODE> <chat_id>   Partner code (ASH) + Telegram chat id
  --invite <url>      Invite link for registry + DM
  --requested-by <cs> Prefer seat call-sign for DM target
  --no-dm             Skip package-room welcome DM
  --no-ack            Skip ack_package_group_linked JSONL append
  --db <path>

acknowledge-pending:
  <CODE>              Partner code with registry row
  --chat <id>         Override chat_id (default from registry)
  --db <path>

send options:
  --all                 Target all chats matching --kind (default kind=active)
  --chat <id>           Target chat id (repeatable)
  --kind <kind>         active|inactive|all|group|private|channel (default: active)
  --surface <slug>      hq | ash-staging | sandbox (concern filter)
  --preview             Resolve targets only; do not call Telegram
  --queue               Enqueue per chat via ops_channel_outbox (drain: telegram:ops:consume)
  --direct              Immediate send (default when --queue omitted)
  --html                sendMessage parse_mode=HTML
  --db <path>           Ops DB (default OPS_DB_PATH or data/operations.db)
  -- <text...>          Message body (supports {{title}} {{chatId}} {{type}} {{members}})

directory options:
  --kind <kind>         Same kinds as send
  --surface <slug>      Concern surface filter
  --refresh             Call getChat + getChatMemberCount for each row
  --json                Print rows as JSON
  --db <path>

Examples:
  bun run telegram:ops -- send --all "Status OK"
  bun run telegram:ops -- send --all --queue "Status OK"
  bun run telegram:ops -- send --all --queue --preview "hello {{title}}"
  bun run telegram:ops -- send --surface ash-staging --all --preview "ping {{title}}"
  bun run telegram:ops -- directory --refresh --kind group
  bun run telegram:ops -- surfaces
`);
  process.exit(0);
}

function parseFilter(raw: string | undefined): KnownChatFilterKind | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (
    v === 'active' ||
    v === 'inactive' ||
    v === 'all' ||
    v === 'group' ||
    v === 'private' ||
    v === 'channel'
  ) {
    return v;
  }
  console.error(`Invalid --kind: ${raw}`);
  process.exit(1);
}

/** Negative Telegram chat ids (-100…) are positional, not flags. */
function isCliFlagToken(a: string): boolean {
  if (a.startsWith('--')) return true;
  if (/^-\d/.test(a)) return false;
  return a.startsWith('-');
}

type CommonOpts = {
  filter?: KnownChatFilterKind;
  surface?: string;
  dbPath: string;
  chats: string[];
  json: boolean;
  refresh: boolean;
  all: boolean;
  dryRun: boolean;
  html: boolean;
  queue: boolean;
  direct: boolean;
  mermaid: boolean;
  envBlock: boolean;
  syncEnv: boolean;
  rich: boolean;
  text: string;
};

function parseArgs(argv: string[]): { cmd: string; opts: CommonOpts } {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') usage();
  const cmd = argv[0]!;
  const rest = argv.slice(1);
  const opts: CommonOpts = {
    dbPath: Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH,
    chats: [],
    json: false,
    refresh: false,
    all: false,
    dryRun: false,
    html: false,
    queue: false,
    direct: false,
    mermaid: false,
    envBlock: false,
    syncEnv: false,
    rich: false,
    text: '',
  };

  const textParts: string[] = [];
  let passthrough = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (passthrough) {
      textParts.push(a);
      continue;
    }
    if (a === '--') {
      passthrough = true;
      continue;
    }
    if (a === '--help' || a === '-h') usage();
    if (a === '--all') {
      opts.all = true;
      continue;
    }
    if (a === '--preview') {
      opts.dryRun = true;
      continue;
    }
    if (a === '--queue') {
      opts.queue = true;
      continue;
    }
    if (a === '--direct') {
      opts.direct = true;
      continue;
    }
    if (a === '--html') {
      opts.html = true;
      continue;
    }
    if (a === '--mermaid') {
      opts.mermaid = true;
      continue;
    }
    if (a === '--env') {
      opts.envBlock = true;
      continue;
    }
    if (a === '--sync-env') {
      opts.syncEnv = true;
      continue;
    }
    if (a === '--json') {
      opts.json = true;
      continue;
    }
    if (a === '--refresh') {
      opts.refresh = true;
      continue;
    }
    if (a === '--rich') {
      opts.rich = true;
      continue;
    }
    if (a === '--kind') {
      opts.filter = parseFilter(rest[++i]);
      continue;
    }
    if (a.startsWith('--kind=')) {
      opts.filter = parseFilter(a.slice('--kind='.length));
      continue;
    }
    if (a === '--surface') {
      opts.surface = rest[++i]?.trim() || undefined;
      continue;
    }
    if (a.startsWith('--surface=')) {
      opts.surface = a.slice('--surface='.length).trim() || undefined;
      continue;
    }
    if (a === '--chat') {
      const v = rest[++i];
      if (v) opts.chats.push(v);
      continue;
    }
    if (a.startsWith('--chat=')) {
      opts.chats.push(a.slice('--chat='.length));
      continue;
    }
    if (a === '--db') {
      const v = rest[++i];
      if (v) opts.dbPath = v;
      continue;
    }
    if (a.startsWith('--db=')) {
      opts.dbPath = a.slice('--db='.length);
      continue;
    }
    if (!isCliFlagToken(a)) {
      textParts.push(a);
      continue;
    }
    console.error(`Unknown option: ${a}`);
    process.exit(1);
  }
  opts.text = textParts.join(' ').trim();
  return { cmd, opts };
}

async function cmdDirectory(opts: CommonOpts): Promise<void> {
  const db = openOperationsDb({ path: opts.dbPath });
  try {
    let rows = listKnownChats(db, {
      filter: opts.filter ?? 'all',
      surface: opts.surface,
      activeOnly: false,
      limit: 500,
    });

    if (opts.refresh) {
      const tg = loadTelegramEnv();
      if (!tg.effectiveToken) {
        console.error('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN required for --refresh');
        process.exit(1);
      }
      const refreshed = await refreshKnownChats({
        db,
        token: tg.effectiveToken,
        filter: opts.filter ?? 'active',
        chatIds: opts.chats.length ? opts.chats : undefined,
      });
      console.log(`refreshed=${refreshed.refreshed} failed=${refreshed.failed}`);
      for (const e of refreshed.errors) {
        console.log(`  ✗ ${e.chatId}: ${e.error}`);
      }
      rows = refreshed.rows.length
        ? refreshed.rows
        : listKnownChats(db, {
            filter: opts.filter ?? 'all',
            surface: opts.surface,
            activeOnly: false,
          });
      if (opts.surface?.trim()) {
        const slug = opts.surface.trim().toLowerCase();
        rows = rows.filter(r => (r.surfaceSlug ?? '').toLowerCase() === slug);
      }
    }

    if (opts.json) {
      const extras = buildKnownChatDirectoryExtras(db, rows, opts.rich);
      const payload = rows.map(r => {
        const extra = extras.get(r.chatId);
        return {
          ...r,
          packageCode: extra?.packageCode ?? null,
          hasInvite: extra?.hasInvite ?? false,
          ...(opts.rich ? { linkedSeats: extra?.linkedSeats ?? 0 } : {}),
        };
      });
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    const extras = buildKnownChatDirectoryExtras(db, rows, opts.rich);
    console.log(`✅ Known chats (${rows.length})  db=${opts.dbPath}${opts.rich ? '  rich' : ''}`);
    for (const line of formatKnownChatsTable(rows, extras, { rich: opts.rich })) {
      console.log(`   ${line}`);
    }
  } finally {
    db.close();
  }
}

async function cmdSend(opts: CommonOpts): Promise<void> {
  if (!opts.text) {
    console.error('Message text required. Example: send --all "hello"');
    process.exit(1);
  }
  if (!opts.all && opts.chats.length === 0) {
    console.error('Specify --all or --chat <id>');
    process.exit(1);
  }
  if (opts.queue && opts.direct) {
    console.error('Use --queue or --direct, not both');
    process.exit(1);
  }

  const tg = loadTelegramEnv();
  if (!tg.effectiveToken && !opts.dryRun && !opts.queue) {
    console.error('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN required');
    process.exit(1);
  }

  const db = openOperationsDb({ path: opts.dbPath });
  try {
    const targets = resolveBroadcastTargets({
      db,
      all: opts.all,
      chatIds: opts.chats.length ? opts.chats : undefined,
      filter: opts.filter,
      surface: opts.surface,
    });

    if (targets.length === 0) {
      console.error(
        'No matching known chats. Run telegram:ops:consume after the bot sees traffic.'
      );
      process.exit(1);
    }

    console.log(
      `targets=${targets.length} filter=${opts.filter ?? (opts.all ? 'active' : 'chat')}`
    );
    for (const line of formatKnownChatsTable(targets)) {
      console.log(`   ${line}`);
    }

    if (opts.queue) {
      if (opts.dryRun) {
        console.log(`✅ Broadcast queue preview: would enqueue ${targets.length} row(s)`);
        process.exit(0);
      }
      const queued = enqueueBroadcastToOutbox({
        db,
        targets,
        textTemplate: opts.text,
        parseMode: opts.html ? 'HTML' : undefined,
      });
      console.log('✅ Broadcast queued');
      console.log(`   batch: ${queued.batchId}`);
      console.log(`   enqueued=${queued.enqueued} skipped=${queued.skipped}`);
      console.log('   drain: bun run telegram:ops:consume');
      process.exit(0);
    }

    const result = await broadcastToKnownChats({
      db,
      token: tg.effectiveToken ?? '',
      text: opts.text,
      targets,
      dryRun: opts.dryRun,
      parseMode: opts.html ? 'HTML' : undefined,
    });

    console.log(opts.dryRun ? '✅ Broadcast dry-run' : '✅ Broadcast complete');
    for (const line of formatBroadcastSummary(result)) {
      console.log(`   ${line}`);
    }
    process.exit(result.failed > 0 ? 1 : 0);
  } finally {
    db.close();
  }
}

function cmdSurfaces(): void {
  for (const line of formatSurfaceMatrix()) console.log(line);
  const map = loadTelegramSurfacesMap();
  const bindings = Object.entries(map);
  console.log('');
  if (bindings.length === 0) {
    console.log('TELEGRAM_SURFACES: (unset — brand CLI uses builtins for ash-staging + sandbox)');
  } else {
    console.log('TELEGRAM_SURFACES bindings:');
    for (const [slug, chatId] of bindings) {
      console.log(`  ${slug.padEnd(14)}  ${chatId}`);
    }
  }
  const ops = loadTelegramEnv().opsChatId;
  console.log(`TELEGRAM_OPS_CHAT_ID: ${ops ?? '(unset)'}`);
}

async function cmdGraph(opts: CommonOpts): Promise<void> {
  const db = openOperationsDb({ path: opts.dbPath });
  try {
    const rows = listKnownChats(db, { filter: 'all', activeOnly: false, limit: 500 });
    const packageGroups = listPackageGroupRegistry(db);
    const model = buildSurfaceGraph({ knownChats: rows, packageGroups });

    if (opts.syncEnv) {
      const tg = loadTelegramEnv();
      const suggested = JSON.parse(model.suggestedSurfacesJson) as Record<string, string>;
      const opsChatId = suggested.hq ?? model.opsChatId ?? tg.opsChatId ?? null;
      const accountingChatId = suggested['all-accounting'] ?? tg.accountingChatId ?? null;
      const synced = await syncTelegramEnvToReasonix({
        surfaces: suggested,
        opsChatId,
        accountingChatId,
      });
      console.log(`synced Reasonix env → ${synced.envPath}`);
      console.log(`  TELEGRAM_SURFACES keys=${Object.keys(suggested).length}`);
      if (opsChatId) console.log(`  TELEGRAM_OPS_CHAT_ID=${opsChatId}`);
      if (accountingChatId) console.log(`  TELEGRAM_ACCOUNTING_CHAT_ID=${accountingChatId}`);
    }

    if (opts.json) {
      console.log(JSON.stringify(model, null, 2));
      return;
    }
    if (opts.mermaid) {
      console.log(formatSurfaceGraphMermaid(model));
      if (opts.envBlock) {
        console.log('');
        for (const line of formatSurfaceGraphEnvBlock(model)) console.log(line);
      }
      return;
    }

    for (const line of formatSurfaceGraphAscii(model)) console.log(line);
    if (opts.envBlock) {
      console.log('');
      for (const line of formatSurfaceGraphEnvBlock(model)) console.log(line);
    }
  } finally {
    db.close();
  }
}

type LinkPackageGroupOpts = {
  dbPath: string;
  partnerCode: string;
  chatId: string; // brand-ok
  invite?: string;
  requestedBy?: string;
  noDm: boolean;
  noAck: boolean;
};

function parseLinkPackageGroupArgs(argv: string[]): LinkPackageGroupOpts | null {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    console.log(`Usage: bun tools/telegram-ops.ts link-package-group <CODE> <chat_id> [options]

Options:
  --invite <url>        Store invite link; include in welcome DM
  --requested-by <cs>   Prefer this call-sign for DM telegram_id
  --no-dm               Skip package-room welcome DM
  --no-ack              Skip ack_package_group_linked JSONL append
  --db <path>
`);
    process.exit(0);
  }
  const positional: string[] = [];
  const opts: LinkPackageGroupOpts = {
    dbPath: Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH,
    partnerCode: '',
    chatId: '',
    noDm: false,
    noAck: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--no-dm') {
      opts.noDm = true;
      continue;
    }
    if (a === '--no-ack') {
      opts.noAck = true;
      continue;
    }
    if (a === '--invite') {
      opts.invite = argv[++i];
      continue;
    }
    if (a.startsWith('--invite=')) {
      opts.invite = a.slice('--invite='.length);
      continue;
    }
    if (a === '--requested-by') {
      opts.requestedBy = argv[++i];
      continue;
    }
    if (a.startsWith('--requested-by=')) {
      opts.requestedBy = a.slice('--requested-by='.length);
      continue;
    }
    if (a === '--db') {
      const v = argv[++i];
      if (v) opts.dbPath = v;
      continue;
    }
    if (a.startsWith('--db=')) {
      opts.dbPath = a.slice('--db='.length);
      continue;
    }
    if (!isCliFlagToken(a)) positional.push(a);
  }
  if (positional.length < 2) {
    console.error('link-package-group requires <CODE> <chat_id>');
    process.exit(1);
  }
  opts.partnerCode = positional[0]!;
  opts.chatId = positional[1]!;
  return opts;
}

async function cmdLinkPackageGroup(rawArgv: string[]): Promise<void> {
  const opts = parseLinkPackageGroupArgs(rawArgv);
  if (!opts) return;

  const db = openOperationsDb({ path: opts.dbPath });
  try {
    let row;
    try {
      const displayNameFromLog =
        (await resolvePackageGroupDisplayName(opts.partnerCode)) ?? `${opts.partnerCode} Ops`;
      row = upsertPackageGroupRegistry(db, {
        partnerCode: opts.partnerCode,
        chatId: opts.chatId,
        displayName: displayNameFromLog,
        inviteLink: opts.invite,
        requestedBy: opts.requestedBy,
      });

      if (opts.requestedBy?.trim()) {
        designatePackageGroupDmSeat(db, {
          partnerCode: row.partnerCode,
          callSign: opts.requestedBy.trim(),
          force: true,
        });
      }
    } catch (err) {
      console.error(
        `link-package-group failed: ${err instanceof Error ? err.message : String(err)}`
      );
      process.exit(1);
    }

    if (opts.requestedBy?.trim()) {
      try {
        const dmAck = await appendAckDmSeatDesignated({
          partnerCode: row.partnerCode,
          callSign: opts.requestedBy.trim(),
        });
        if (dmAck.appended) {
          console.log(`   dm seat: designated ${opts.requestedBy.trim()} (jsonl ack appended)`);
        }
      } catch (err) {
        console.log(`   dm seat: note — ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(`✅ package_group_registry ${row.partnerCode}`);
    console.log(`   title: ${row.title}`);
    console.log(`   chat_id: ${row.chatId}`);
    if (row.inviteLink) console.log(`   invite: ${row.inviteLink}`);

    const forumMeta = await loadPackageGroupForumMetadata(row.partnerCode);
    if (forumMeta) {
      console.log('   forum topics (per-chat routing — not global TELEGRAM_TOPICS):');
      for (const line of formatPackageGroupTopicsHandoff(forumMeta)) {
        console.log(`   ${line}`);
      }
    } else {
      console.log('   forum topics: (no metadata — run ct forum-metadata-backfill + sync)');
    }

    if (!opts.noAck) {
      const ack = await appendAckPackageGroupLinked({
        partnerCode: row.partnerCode,
        chatId: row.chatId,
        registryTitle: row.title,
      });
      console.log(
        ack.appended
          ? `   jsonl: ack_package_group_linked appended (${ack.path})`
          : `   jsonl: ack_package_group_linked already present (skipped)`
      );
    }

    if (opts.noDm) {
      const dmSeat = assessPackageGroupDmSeat(db, row.partnerCode);
      if (dmSeat.status === 'designated') {
        console.log(`   dm: skipped (--no-dm) — will DM ${dmSeat.callSign} when telegram linked`);
      } else {
        console.log('   dm: skipped (--no-dm)');
      }
      return;
    }

    const tg = loadTelegramEnv();
    if (!tg.effectiveToken) {
      console.log('   dm: skipped (no TELEGRAM_BOT_FACTORY)');
      return;
    }

    const dmId = resolvePartnerDmTelegramId(db, row.partnerCode, opts.requestedBy);
    if (!dmId) {
      const dmSeat = assessPackageGroupDmSeat(db, row.partnerCode);
      if (dmSeat.status === 'designated') {
        console.log(`   dm: skipped — ${dmSeat.callSign} designated, awaiting telegram id`);
        console.log(`   hint: ${dmSeat.nextStep}`);
      } else {
        console.log('   dm: skipped (no linked telegram_id for partner seats)');
        console.log('   hint: bun run telegram:ops -- designate-dm-seat CODE CODE-001');
      }
      return;
    }

    const activeSeat = opts.requestedBy?.trim();
    if (activeSeat) {
      const switched = setActiveCallSignForTelegram(db, dmId, activeSeat);
      if (switched.ok) {
        console.log(`   bot seat: active ${switched.activeCallSign} (/seat to switch)`);
      }
    }
    const botNode = resolveFlowNodeForTelegram(db, dmId, {
      callSignHint: activeSeat ?? undefined,
    });
    if (botNode) {
      console.log(`   bot context: ${botNode.call_sign ?? '?'} · ${botNode.name}`);
    }

    const inviteLine = row.inviteLink ? `\nJoin your package room:\n${row.inviteLink}` : '';
    const text = [
      `<b>Package room ready</b>`,
      `Group: <code>${row.title}</code>`,
      `Partner: <code>${row.partnerCode}</code>${inviteLine}`,
    ].join('\n');

    const sent = await sendTelegramBotMessage(tg.effectiveToken, {
      chatId: dmId,
      text,
      parseMode: 'HTML',
    });
    console.log(
      sent.ok
        ? `   dm: sent to ${dmId} message_id=${sent.messageId ?? '?'}`
        : `   dm: failed ${sent.description ?? 'sendMessage error'}`
    );
  } finally {
    db.close();
  }
}

async function cmdAcknowledgePending(rawArgv: string[]): Promise<void> {
  if (rawArgv.length === 0 || rawArgv[0] === '--help' || rawArgv[0] === '-h') {
    console.log(
      `Usage: bun tools/telegram-ops.ts acknowledge-pending <CODE> [--chat <id>] [--db <path>]`
    );
    process.exit(0);
  }
  let partnerCode = '';
  let chatId: string | undefined; // brand-ok — Telegram chat_id wire
  let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  const positional: string[] = [];
  for (let i = 0; i < rawArgv.length; i++) {
    const a = rawArgv[i]!;
    if (a === '--chat') {
      chatId = rawArgv[++i];
      continue;
    }
    if (a.startsWith('--chat=')) {
      chatId = a.slice('--chat='.length);
      continue;
    }
    if (a === '--db') {
      const v = rawArgv[++i];
      if (v) dbPath = v;
      continue;
    }
    if (a.startsWith('--db=')) {
      dbPath = a.slice('--db='.length);
      continue;
    }
    if (!isCliFlagToken(a)) positional.push(a);
  }
  partnerCode = positional[0] ?? '';
  if (!parsePartnerCode(partnerCode)) {
    console.error('Invalid partner CODE (expected ^[A-Z]{2,4}$)');
    process.exit(1);
  }

  const db = openOperationsDb({ path: dbPath });
  try {
    const reg = getPackageGroupRegistry(db, partnerCode);
    if (!reg) {
      console.error(`No package_group_registry row for ${partnerCode.toUpperCase()}`);
      process.exit(1);
    }
    const resolvedChat = chatId ?? reg.chatId;
    if (!parseTelegramChatIdWire(resolvedChat)) {
      console.error(`Invalid chat_id: ${resolvedChat}`);
      process.exit(1);
    }
    const ack = await appendAckPackageGroupLinked({
      partnerCode: reg.partnerCode,
      chatId: resolvedChat,
      registryTitle: reg.title,
    });
    console.log(
      ack.appended
        ? `✅ ack_package_group_linked ${reg.partnerCode} ${resolvedChat}`
        : `note: ack_package_group_linked already present for ${reg.partnerCode}`
    );
    console.log(`   path: ${ack.path}`);
  } finally {
    db.close();
  }
}

async function cmdDesignateDmSeat(rawArgv: string[]): Promise<void> {
  if (rawArgv.length === 0 || rawArgv[0] === '--help' || rawArgv[0] === '-h') {
    console.log(`Usage: bun tools/telegram-ops.ts designate-dm-seat <CODE> <call-sign> [--force] [--db <path>]

Acknowledge which operator seat receives package-room DMs before Telegram id is linked.
SSOT: package_group_registry.requested_by (e.g. NOV-001).

Examples:
  bun run telegram:ops -- designate-dm-seat NOV NOV-001
  bun run telegram:ops -- designate-dm-seat PAT PAT-001 --force
`);
    process.exit(0);
  }

  let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  let force = false;
  const positional: string[] = [];
  for (let i = 0; i < rawArgv.length; i++) {
    const a = rawArgv[i]!;
    if (a === '--force') {
      force = true;
      continue;
    }
    if (a === '--db') {
      const v = rawArgv[++i];
      if (v) dbPath = v;
      continue;
    }
    if (!isCliFlagToken(a)) positional.push(a);
  }
  if (positional.length < 2) {
    console.error('designate-dm-seat requires <CODE> <call-sign>');
    process.exit(1);
  }

  const db = openOperationsDb({ path: dbPath });
  try {
    const result = designatePackageGroupDmSeat(db, {
      partnerCode: positional[0]!,
      callSign: positional[1]!,
      force,
    });
    const ack = await appendAckDmSeatDesignated({
      partnerCode: result.registry.partnerCode,
      callSign: result.assessment.callSign!,
    });
    console.log(
      result.changed
        ? `✅ DM seat designated · ${result.registry.partnerCode} → ${result.assessment.callSign}`
        : `note: DM seat already ${result.assessment.callSign} for ${result.registry.partnerCode}`
    );
    console.log(
      ack.appended
        ? `   jsonl: ack_dm_seat_designated appended (${ack.path})`
        : `   jsonl: ack_dm_seat_designated already present`
    );
    console.log(`   status: ${formatDmSeatStatus(result.assessment.status)}`);
    console.log(`   next: ${result.assessment.nextStep}`);
  } finally {
    db.close();
  }
}

async function cmdSendForumInvite(rawArgv: string[]): Promise<void> {
  let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  let dryRun = false;
  let force = false;
  let allGaps = false;
  const partnerCodes: string[] = [];

  for (let i = 0; i < rawArgv.length; i++) {
    const a = rawArgv[i]!;
    if (a === '--dry-run') dryRun = true;
    else if (a === '--force') force = true;
    else if (a === '--all') allGaps = true;
    else if (a === '--db' && rawArgv[i + 1]) dbPath = rawArgv[++i]!;
    else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: bun tools/telegram-ops.ts send-forum-invite [CODE…] [--all] [--dry-run] [--force]

Sends forum invite DM to linked operator still at 2·house! (partner not in group).
Appends ack_forum_invite_sent to package group JSONL on success.

  bun run telegram:ops -- send-forum-invite NOV
  bun run telegram:ops -- send-forum-invite --all
  bun run telegram:ops -- send-forum-invite NOV --dry-run
`);
      process.exit(0);
    } else if (!a.startsWith('-')) {
      const code = parsePartnerCode(a);
      if (code) partnerCodes.push(code);
    }
  }

  if (!allGaps && partnerCodes.length === 0) {
    console.error('Provide partner CODE or --all');
    process.exit(1);
  }

  const tg = loadTelegramEnv();
  if (!tg.effectiveToken && !dryRun) {
    console.error('TELEGRAM_BOT_FACTORY required (or use --dry-run)');
    process.exit(1);
  }

  const db = openOperationsDb({ path: dbPath });
  try {
    const results = allGaps
      ? await sendForumInviteDmsForGaps({
          db,
          token: tg.effectiveToken ?? 'dry-run',
          dryRun,
          force,
        })
      : await Promise.all(
          partnerCodes.map(code =>
            sendForumInviteDm({
              db,
              token: tg.effectiveToken ?? 'dry-run',
              partnerCode: code,
              dryRun,
              force,
            })
          )
        );

    if (results.length === 0) {
      console.log('(no forum invite gaps)');
      return;
    }

    for (const r of results) {
      if (!r.ok) {
        console.log(`   ${r.partnerCode}: FAIL — ${r.reason}`);
      } else if ('skipped' in r && r.skipped) {
        console.log(`   ${r.partnerCode}: skip — ${r.reason}`);
      } else if ('telegramId' in r) {
        const reg = getPackageGroupRegistry(db, r.partnerCode);
        if (dryRun && reg) {
          console.log(`   ${r.partnerCode}: dry-run → ${r.telegramId}`);
          console.log(
            formatForumInviteDmText({
              partnerCode: r.partnerCode,
              registryTitle: reg.title,
              inviteLink: reg.inviteLink ?? '',
              callSign: reg.requestedBy,
            }).replace(/\n/g, '\n      ')
          );
        } else {
          console.log(
            `   ${r.partnerCode}: sent to ${r.telegramId} message_id=${r.messageId ?? '?'} ack=${r.ackAppended ? 'new' : 'dup'}`
          );
        }
      }
    }

    const failed = results.filter(r => !r.ok).length;
    if (failed > 0) process.exit(1);
  } finally {
    db.close();
  }
}

async function cmdReadiness(rawArgv: string[]): Promise<void> {
  let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  let wantJson = false;
  let detail = false;
  let live = false;
  let deep = false;
  const partnerCodes: string[] = [];

  for (let i = 0; i < rawArgv.length; i++) {
    const a = rawArgv[i]!;
    if (a === '--json') wantJson = true;
    else if (a === '--live') live = true;
    else if (a === '--detail') detail = true;
    else if (a === '--deep') deep = true;
    else if (a === '--db' && rawArgv[i + 1]) dbPath = rawArgv[++i]!;
    else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: bun tools/telegram-ops.ts readiness [CODE…] [--detail] [--deep] [--live] [--json]

Phased E2E gates: forum_ready → designated (awaiting telegram) → operator_ready.
Use --deep with --detail for per-lane audit (forum / routing / operator).
`);
      process.exit(0);
    } else if (!a.startsWith('-')) {
      const code = parsePartnerCode(a);
      if (code) partnerCodes.push(code);
    }
  }

  const tg = loadTelegramEnv();
  const db = openOperationsDb({ path: dbPath });
  try {
    const codes =
      partnerCodes.length > 0 ? partnerCodes : listPackageGroupRegistry(db).map(r => r.partnerCode);
    const rows = [];
    for (const code of codes) {
      rows.push(
        await assessHandshakeReadiness({
          db,
          partnerCode: code,
          telegramToken: tg.effectiveToken,
          live,
          deep: deep || detail,
        })
      );
    }

    if (wantJson) {
      console.log(JSON.stringify({ rows, dbPath }, null, 2));
      return;
    }

    console.log(`handshake readiness · ${rows.length} partner(s) · db=${dbPath}`);
    if (detail) {
      for (const row of rows) {
        for (const line of formatHandshakeReadinessDetail(row)) console.log(line);
        console.log('');
      }
    } else {
      for (const line of formatHandshakeReadinessTable(rows)) console.log(`   ${line}`);
    }

    const blocked = rows.some(r => r.phase === 'blocked');
    if (blocked) process.exit(1);
  } finally {
    db.close();
  }
}

async function cmdSeatMap(opts: CommonOpts): Promise<void> {
  const db = openOperationsDb({ path: opts.dbPath });
  try {
    const seats = await buildSeatTelegramMap(db);
    const packages = await buildPartnerPackageMap(db);
    if (opts.json) {
      console.log(JSON.stringify({ seats, packages, dbPath: opts.dbPath }, null, 2));
      return;
    }
    console.log(`seat-map · db=${opts.dbPath}`);
    console.log('');
    console.log('Operator DM seats (bot /status · package welcome DMs):');
    for (const line of formatSeatTelegramMapTable(seats)) console.log(`   ${line}`);
    console.log('');
    console.log('Package groups (all linked partners — forum + DM target):');
    for (const line of formatPartnerPackageMapTable(packages)) console.log(`   ${line}`);
    console.log('');
    console.log(
      '   Bot: /seat · /seat BIL-001   Link seat: bun tools/telegram-link-chat.ts NOV-001 <id>'
    );
  } finally {
    db.close();
  }
}

async function main(): Promise<void> {
  await loadReasonixEnv();
  const argv = Bun.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') usage();

  const cmd = argv[0]!;
  if (cmd === 'link-package-group' || cmd === 'link-package') {
    await cmdLinkPackageGroup(argv.slice(1));
    return;
  }
  if (cmd === 'acknowledge-pending' || cmd === 'ack-pending') {
    await cmdAcknowledgePending(argv.slice(1));
    return;
  }
  if (cmd === 'seat-map' || cmd === 'seats') {
    const { opts } = parseArgs([cmd, ...argv.slice(1)]);
    await cmdSeatMap(opts);
    return;
  }
  if (cmd === 'designate-dm-seat' || cmd === 'designate-dm') {
    await cmdDesignateDmSeat(argv.slice(1));
    return;
  }
  if (cmd === 'readiness' || cmd === 'handshake-readiness') {
    await cmdReadiness(argv.slice(1));
    return;
  }
  if (cmd === 'send-forum-invite' || cmd === 'forum-invite') {
    await cmdSendForumInvite(argv.slice(1));
    return;
  }

  const { cmd: parsedCmd, opts } = parseArgs(argv);
  if (parsedCmd === 'send') await cmdSend(opts);
  else if (parsedCmd === 'directory' || parsedCmd === 'dir' || parsedCmd === 'ls')
    await cmdDirectory(opts);
  else if (parsedCmd === 'surfaces' || parsedCmd === 'matrix') cmdSurfaces();
  else if (parsedCmd === 'graph' || parsedCmd === 'topo') await cmdGraph(opts);
  else {
    console.error(`Unknown command: ${parsedCmd}`);
    usage();
  }
}

if (import.meta.main) {
  await main();
}

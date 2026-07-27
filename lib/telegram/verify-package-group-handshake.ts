// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Read-only validation for package-group handshake lifecycle (JSONL + registry).
 */
import type { Database } from 'bun:sqlite';
import { formatPackageGroupTitle } from './surfaces.ts';
import { getChat } from './telegram-api.ts';
import {
  getPackageGroupRegistry,
  parsePartnerCode,
  readPackageGroupEventLog,
  resolveOpenPendingCreates,
  type AckPackageGroupLinkedArtifact,
  type AckPackageGroupWiredArtifact,
  type PackageGroupCreateArtifact,
  type PackageGroupEventLogEntry,
  PENDING_PACKAGE_GROUPS_JSONL,
} from './package-group-registry.ts';
import { assessPackageGroupDmSeat, formatDmSeatStatus } from './dm-seat-designation.ts';
import {
  loadPackageGroupForumMetadata,
  validateForumMetadataAgainstRegistry,
} from './package-group-forum.ts';

export type HandshakeCheck = {
  id: string; // brand-ok — opaque handshake check label
  ok: boolean;
  detail: string;
};

export type HandshakeVerifyResult = {
  ok: boolean;
  partnerCode: string;
  jsonlPath: string;
  checks: HandshakeCheck[];
  nextAction?: string;
};

export function latestCreateForPartner(
  log: PackageGroupEventLogEntry[],
  partnerCode: string
): PackageGroupCreateArtifact | null {
  const code = parsePartnerCode(partnerCode);
  if (!code) return null;
  let latest: PackageGroupCreateArtifact | null = null;
  for (const entry of log) {
    if (entry.action === 'create_package_group' && entry.partner_code === code) {
      latest = entry;
    }
  }
  return latest;
}

export function latestWiredAckForPartner(
  log: PackageGroupEventLogEntry[],
  partnerCode: string
): AckPackageGroupWiredArtifact | null {
  const code = parsePartnerCode(partnerCode);
  if (!code) return null;
  let latest: AckPackageGroupWiredArtifact | null = null;
  for (const entry of log) {
    if (entry.action === 'ack_package_group_wired' && entry.partner_code === code) {
      latest = entry;
    }
  }
  return latest;
}

export function latestLinkedAckForPartner(
  log: PackageGroupEventLogEntry[],
  partnerCode: string
): AckPackageGroupLinkedArtifact | null {
  const code = parsePartnerCode(partnerCode);
  if (!code) return null;
  let latest: AckPackageGroupLinkedArtifact | null = null;
  for (const entry of log) {
    if (entry.action === 'ack_package_group_linked' && entry.partner_code === code) {
      latest = entry;
    }
  }
  return latest;
}

export async function verifyPackageGroupHandshake(opts: {
  db: Database;
  partnerCode: string;
  jsonlPath?: string;
  /** Call Telegram getChat on registry chat_id and assert forum title byte-match. */
  live?: boolean;
  telegramToken?: string | null;
  /** Root dir for reports/telegram/forums (default cwd-relative). */
  forumsMetaDir?: string;
}): Promise<HandshakeVerifyResult> {
  const code = parsePartnerCode(opts.partnerCode);
  const jsonlPath = opts.jsonlPath ?? PENDING_PACKAGE_GROUPS_JSONL;
  const checks: HandshakeCheck[] = [];

  if (!code) {
    return {
      ok: false,
      partnerCode: opts.partnerCode.toUpperCase(),
      jsonlPath,
      checks: [{ id: 'partner_code', ok: false, detail: 'Invalid partner code (^[A-Z]{2,4}$)' }],
      nextAction: 'Use partner package code e.g. ASH (not ASH-001)',
    };
  }

  const log = await readPackageGroupEventLog(jsonlPath);
  const create = latestCreateForPartner(log, code);
  const wired = latestWiredAckForPartner(log, code);
  const linked = latestLinkedAckForPartner(log, code);
  const open = resolveOpenPendingCreates(log);
  const registry = getPackageGroupRegistry(opts.db, code);

  checks.push({
    id: 'create_artifact',
    ok: create != null,
    detail: create
      ? `create at ${create.timestamp} title=${create.suggested_title}`
      : 'No create_package_group line for this code',
  });

  if (create) {
    const expected = formatPackageGroupTitle(code, create.display_name);
    checks.push({
      id: 'title_grammar',
      ok: create.suggested_title === expected,
      detail:
        create.suggested_title === expected
          ? `title OK: ${expected}`
          : `expected "${expected}" got "${create.suggested_title}"`,
    });
  }

  const openForCode = open.some(r => r.partner_code === code);
  checks.push({
    id: 'soft_wired',
    ok: !openForCode && wired != null,
    detail: wired
      ? `wired ack chat_id=${wired.chat_id}`
      : openForCode
        ? 'Still open on Soft pending list (run ct package-group-wire --apply --ack)'
        : 'No ack_package_group_wired line',
  });

  checks.push({
    id: 'factory_registry',
    ok: registry != null,
    detail: registry
      ? `registry chat_id=${registry.chatId} title=${registry.title}`
      : 'No package_group_registry row',
  });

  if (registry && wired) {
    checks.push({
      id: 'registry_matches_wired',
      ok: registry.chatId === wired.chat_id,
      detail:
        registry.chatId === wired.chat_id
          ? `chat_id ${registry.chatId} matches wired ack`
          : `registry ${registry.chatId} != wired ${wired.chat_id}`,
    });
  }

  if (registry) {
    const titleOk = registry.title === formatPackageGroupTitle(code, create?.display_name ?? code);
    checks.push({
      id: 'registry_title',
      ok: titleOk,
      detail: titleOk ? `registry title OK` : `registry title "${registry.title}"`,
    });
  }

  checks.push({
    id: 'factory_linked_ack',
    ok: linked != null,
    detail: linked
      ? `linked ack at ${linked.timestamp}`
      : 'No ack_package_group_linked (run link-package-group or acknowledge-pending)',
  });

  if (registry && linked) {
    checks.push({
      id: 'linked_matches_registry',
      ok: linked.chat_id === registry.chatId,
      detail:
        linked.chat_id === registry.chatId
          ? 'linked ack chat_id matches registry'
          : `linked ${linked.chat_id} != registry ${registry.chatId}`,
    });
  }

  if (registry) {
    const dm = assessPackageGroupDmSeat(opts.db, code);
    checks.push({
      id: 'dm_seat',
      ok: dm.status === 'designated' || dm.status === 'linked' || dm.status === 'shared',
      detail:
        dm.status === 'none'
          ? 'no DM seat designated — run designate-dm-seat'
          : dm.status === 'designated'
            ? `${dm.callSign} ${formatDmSeatStatus(dm.status)} (welcome DM blocked until link)`
            : `${dm.callSign} → ${dm.telegramId} · ${formatDmSeatStatus(dm.status)}`,
    });
  }

  if (registry) {
    const meta = await loadPackageGroupForumMetadata(code, {
      rootDir: opts.forumsMetaDir,
    });
    if (!meta) {
      checks.push({
        id: 'forum_metadata',
        ok: true,
        detail:
          'no forums metadata file (manual create or pre-branding — run ct forum-metadata-backfill)',
      });
    } else {
      const v = validateForumMetadataAgainstRegistry(meta, code, registry.chatId);
      checks.push({
        id: 'forum_metadata',
        ok: v.ok,
        detail: v.detail,
      });
    }
  }

  if (opts.live && registry) {
    const expectedLive = formatPackageGroupTitle(code, create?.display_name ?? code);
    const token = opts.telegramToken?.trim() || null;
    if (!token) {
      checks.push({
        id: 'live_forum_title',
        ok: false,
        detail: 'live check skipped (no TELEGRAM_BOT_FACTORY / --live token)',
      });
    } else {
      const live = await getChat(token, registry.chatId);
      if (!live.ok) {
        checks.push({
          id: 'live_forum_title',
          ok: false,
          detail: live.description ?? `getChat failed for ${registry.chatId}`,
        });
      } else {
        const actual = live.chat.title ?? '';
        checks.push({
          id: 'live_forum_title',
          ok: actual === expectedLive,
          detail:
            actual === expectedLive
              ? `Telegram title OK: ${actual}`
              : `Telegram "${actual}" != expected "${expectedLive}"`,
        });
      }
    }
  }

  const ok = checks.every(c => c.ok);
  let nextAction: string | undefined;
  if (!ok) {
    if (!create) {
      nextAction = `bun tools/onboard-partner-package.ts ${code}-001 --create-package-group`;
    } else if (openForCode || !wired) {
      nextAction = `bun run ct package-group-wire ${code} --chat tg:chat:-100… --apply --ack`;
    } else if (!registry) {
      nextAction = `bun run telegram:ops -- link-package-group ${code} -100… --invite '…'`;
    } else if (!linked) {
      nextAction = `bun run telegram:ops -- acknowledge-pending ${code}`;
    } else if (checks.some(c => c.id === 'dm_seat' && !c.ok)) {
      nextAction = `bun run telegram:ops -- designate-dm-seat ${code} ${code}-001`;
    } else if (opts.live && checks.some(c => c.id === 'live_forum_title' && !c.ok)) {
      nextAction = `Rename forum to ${formatPackageGroupTitle(code, create?.display_name ?? code)} (setChatTitle or Telegram UI)`;
    }
  }

  return { ok, partnerCode: code, jsonlPath, checks, nextAction };
}

export function formatHandshakeVerifyReport(result: HandshakeVerifyResult): string[] {
  const lines = [
    `package-group handshake · ${result.partnerCode} · ${result.ok ? 'OK' : 'FAIL'}`,
    `jsonl: ${result.jsonlPath}`,
  ];
  for (const c of result.checks) {
    lines.push(`  ${c.ok ? '✓' : '✗'} ${c.id}: ${c.detail}`);
  }
  if (result.nextAction) lines.push('', `next: ${result.nextAction}`);
  return lines;
}

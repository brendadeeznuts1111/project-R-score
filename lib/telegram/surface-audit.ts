// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * TOC Ops Telegram surface audit — titles, bindings, ACL, routing gaps.
 *
 *   bun run telegram:surfaces:audit
 */
import type { KnownChatRow } from './known-chats.ts';
import {
  TOC_OPS_SURFACES,
  assertTocOpsGroupTitle,
  formatTocOpsGroupTitle,
  loadTelegramSurfacesMap,
  parseTocOpsGroupTitle,
  preferredSurfaceForOutboxTopic,
} from './surfaces.ts';
import { OPS_CHANNEL_TOPICS } from '../channels/ops-channel-event.ts';
import { loadTelegramEnv } from './telegram-config.ts';

export type AuditFinding = {
  id: string; // brand-ok — audit finding id
  severity: 'blocker' | 'major' | 'minor' | 'info';
  area: 'naming' | 'binding' | 'routing' | 'acl' | 'topics' | 'privacy' | 'ops';
  message: string;
  fix?: string;
};

export type SurfaceAuditReport = {
  generatedAt: string;
  findings: AuditFinding[];
  summary: {
    blockers: number;
    majors: number;
    minors: number;
    infos: number;
    ok: boolean;
  };
  titleChecks: Array<{
    chatId: string; // brand-ok
    title: string | null;
    ok: boolean;
    reason: string | null;
    surfaceSlug: string | null;
  }>;
  bindingMatrix: Array<{
    slug: string;
    expectedTitle: string;
    envChatId: string | null; // brand-ok
    knownChatId: string | null; // brand-ok
    status: 'bound' | 'env-only' | 'known-only' | 'missing';
  }>;
};

function sevRank(s: AuditFinding['severity']): number {
  return { blocker: 0, major: 1, minor: 2, info: 3 }[s];
}

export function auditTelegramSurfaces(opts: {
  knownChats: KnownChatRow[];
  env?: Record<string, string | undefined>;
  /** From discovery: bot.can_read_all_group_messages */
  canReadAllGroupMessages?: boolean | null;
  /** chatId → can_manage_topics when probed */
  canManageTopicsByChat?: Record<string, boolean | null>;
}): SurfaceAuditReport {
  const env = opts.env ?? Bun.env;
  const tg = loadTelegramEnv();
  const envMap = loadTelegramSurfacesMap(env);
  const active = opts.knownChats.filter(r => r.active);
  const findings: AuditFinding[] = [];

  if (!tg.effectiveToken) {
    findings.push({
      id: 'A-TOKEN',
      severity: 'blocker',
      area: 'ops',
      message: 'TELEGRAM_BOT_FACTORY / TELEGRAM_BOT_TOKEN unset',
      fix: 'Set TELEGRAM_BOT_FACTORY in .env or ~/.reasonix/.env',
    });
  }
  if (!tg.opsChatId) {
    findings.push({
      id: 'A-OPS-CHAT',
      severity: 'major',
      area: 'binding',
      message: 'TELEGRAM_OPS_CHAT_ID unset',
      fix: 'Set to ash-staging or hq chat id',
    });
  }
  if (!env.TELEGRAM_SURFACES?.trim()) {
    findings.push({
      id: 'A-SURFACES-ENV',
      severity: 'major',
      area: 'binding',
      message: 'TELEGRAM_SURFACES unset — outbox cannot prefer HQ vs ash vs sandbox',
      fix: 'bun run telegram:ops -- graph --env',
    });
  }
  if (tg.opsAdminUserIds.length === 0) {
    findings.push({
      id: 'A-ADMINS',
      severity: 'minor',
      area: 'acl',
      message: 'OPS_ADMIN_USER_IDS empty — /deploy fail-closed without portal admin',
      fix: 'OPS_ADMIN_USER_IDS=<your telegram user id>',
    });
  }
  if (opts.canReadAllGroupMessages === false) {
    findings.push({
      id: 'A-PRIVACY',
      severity: 'major',
      area: 'privacy',
      message:
        'Bot privacy mode on — group messages need @mention until BotFather /setprivacy Disable',
      fix: '@BotFather → /setprivacy → Disable',
    });
  }

  const titleChecks: SurfaceAuditReport['titleChecks'] = [];
  for (const row of active.filter(r => r.chatType === 'group' || r.chatType === 'supergroup')) {
    const title = row.title;
    if (!title) {
      titleChecks.push({
        chatId: row.chatId,
        title,
        ok: false,
        reason: 'missing title',
        surfaceSlug: row.surfaceSlug,
      });
      findings.push({
        id: `A-TITLE-${row.chatId}`,
        severity: 'minor',
        area: 'naming',
        message: `Group ${row.chatId} has no title`,
        fix: 'bun run telegram:brand -- --groups',
      });
      continue;
    }
    const reason = assertTocOpsGroupTitle(title);
    const parsed = parseTocOpsGroupTitle(title);
    titleChecks.push({
      chatId: row.chatId,
      title,
      ok: reason == null,
      reason,
      surfaceSlug: parsed.ok ? (parsed.surfaceSlug ?? null) : row.surfaceSlug,
    });
    if (reason) {
      findings.push({
        id: `A-TITLE-${row.chatId}`,
        severity: 'major',
        area: 'naming',
        message: `Title "${title}" fails grammar: ${reason}`,
        fix: 'Rename to TOC Ops · {CONCERN}[ · {ENV}]',
      });
    }
  }

  const bindingMatrix: SurfaceAuditReport['bindingMatrix'] = [];
  for (const s of TOC_OPS_SURFACES) {
    const expectedTitle = formatTocOpsGroupTitle(s);
    const envChatId = envMap[s.slug] ?? null;
    const known = active.find(r => r.surfaceSlug === s.slug);
    const knownChatId = known?.chatId ?? null;
    let status: SurfaceAuditReport['bindingMatrix'][number]['status'] = 'missing';
    if (envChatId && knownChatId) status = 'bound';
    else if (envChatId) status = 'env-only';
    else if (knownChatId) status = 'known-only';
    bindingMatrix.push({ slug: s.slug, expectedTitle, envChatId, knownChatId, status });

    if (status === 'missing') {
      findings.push({
        id: `A-BIND-${s.slug}`,
        severity: s.slug === 'hq' ? 'major' : 'minor',
        area: 'binding',
        message: `Surface ${s.slug} unbound (expected "${expectedTitle}")`,
        fix:
          s.slug === 'hq'
            ? 'Message in TOC Ops · HQ with bot present, then directory --refresh'
            : `bun run telegram:brand -- --chat <id> --surface ${s.slug}`,
      });
    } else if (status === 'known-only') {
      findings.push({
        id: `A-BIND-ENV-${s.slug}`,
        severity: 'minor',
        area: 'binding',
        message: `${s.slug} live in known chats but missing from TELEGRAM_SURFACES`,
        fix: 'bun run telegram:ops -- graph --env',
      });
    }

    const topicsFlag = opts.canManageTopicsByChat?.[knownChatId ?? envChatId ?? ''];
    if (topicsFlag === false && (knownChatId || envChatId)) {
      findings.push({
        id: `A-TOPICS-${s.slug}`,
        severity: 'major',
        area: 'topics',
        message: `${s.slug}: bot lacks can_manage_topics`,
        fix: 'Promote bot → Manage Topics, then telegram:brand -- --groups',
      });
    }
  }

  // Routing: preferred surface missing → falls back (info when ops hub exists)
  for (const topic of OPS_CHANNEL_TOPICS) {
    const preferred = preferredSurfaceForOutboxTopic(topic);
    const bind = bindingMatrix.find(b => b.slug === preferred);
    if (bind?.status === 'missing' && tg.opsChatId) {
      findings.push({
        id: `A-ROUTE-${topic}`,
        severity: 'info',
        area: 'routing',
        message: `Outbox topic ${topic} prefers ${preferred} (missing) — falls back to TELEGRAM_OPS_CHAT_ID`,
      });
    }
  }

  findings.sort((a, b) => sevRank(a.severity) - sevRank(b.severity) || a.id.localeCompare(b.id));
  const blockers = findings.filter(f => f.severity === 'blocker').length;
  const majors = findings.filter(f => f.severity === 'major').length;
  const minors = findings.filter(f => f.severity === 'minor').length;
  const infos = findings.filter(f => f.severity === 'info').length;

  return {
    generatedAt: new Date().toISOString(),
    findings,
    summary: {
      blockers,
      majors,
      minors,
      infos,
      ok: blockers === 0 && majors === 0,
    },
    titleChecks,
    bindingMatrix,
  };
}

export function formatSurfaceAuditDigest(report: SurfaceAuditReport): string[] {
  const lines = [
    `SURFACE AUDIT  ${report.generatedAt.slice(0, 19).replace('T', ' ')}Z`,
    `ok=${report.summary.ok}  blockers=${report.summary.blockers} majors=${report.summary.majors} minors=${report.summary.minors} infos=${report.summary.infos}`,
    '',
    'Bindings',
  ];
  for (const b of report.bindingMatrix) {
    lines.push(
      `  ${b.status.padEnd(11)}  ${b.slug.padEnd(14)}  env=${b.envChatId ?? '—'}  known=${b.knownChatId ?? '—'}  "${b.expectedTitle}"`
    );
  }
  lines.push('');
  lines.push('Findings');
  if (report.findings.length === 0) lines.push('  (none)');
  for (const f of report.findings) {
    lines.push(`  [${f.severity}] ${f.id} · ${f.area}: ${f.message}`);
    if (f.fix) lines.push(`           fix: ${f.fix}`);
  }
  return lines;
}

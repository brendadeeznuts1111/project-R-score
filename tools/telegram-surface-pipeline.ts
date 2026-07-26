#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * TOC Ops Telegram surface pipeline — discovery · audit · mapping lanes.
 *
 *   bun run telegram:surfaces:discover
 *   bun run telegram:surfaces:audit
 *   bun run telegram:surfaces:map
 *   bun run telegram:surfaces:pipeline          # all three → reports/telegram/
 *
 * Designed for parallel subagent execution (one lane each).
 */
import { Database } from 'bun:sqlite';
import { DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { listKnownChats } from '../lib/telegram/known-chats.ts';
import { refreshKnownChats } from '../lib/telegram/refresh-known-chats.ts';
import { auditTelegramSurfaces, formatSurfaceAuditDigest } from '../lib/telegram/surface-audit.ts';
import {
  buildSurfaceGraph,
  formatSurfaceGraphAscii,
  formatSurfaceGraphEnvBlock,
  formatSurfaceGraphMermaid,
} from '../lib/telegram/surface-graph.ts';
import {
  discoverTelegramAssets,
  formatDiscoveryDigest,
} from '../lib/telegram/telegram-discovery.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

const OUT_DIR = 'reports/telegram';

type Lane = 'discover' | 'audit' | 'map' | 'pipeline';

function usage(): never {
  console.log(`Usage: bun tools/telegram-surface-pipeline.ts <lane> [options]

Lanes:
  discover    Bot API + known chats inventory → reports/telegram/discovery.json
  audit       Title/binding/ACL/routing audit → reports/telegram/audit.json
  map         Live surface graph + env suggest → reports/telegram/map.json
  pipeline    Run all three sequentially (or use parallel subagents)

Options:
  --refresh   Refresh known-chat titles/member counts first
  --stdout    Also print human digest to stdout
  --help
`);
  process.exit(0);
}

function parseArgs(argv: string[]): { lane: Lane; refresh: boolean; stdout: boolean } {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') usage();
  const lane = argv[0] as Lane;
  if (!['discover', 'audit', 'map', 'pipeline'].includes(lane)) {
    console.error(`Unknown lane: ${lane}`);
    usage();
  }
  return {
    lane,
    refresh: argv.includes('--refresh'),
    stdout: argv.includes('--stdout'),
  };
}

async function ensureOut(): Promise<void> {
  await Bun.$`mkdir -p ${OUT_DIR}`.quiet();
}

async function maybeRefresh(dbPath: string): Promise<void> {
  const tg = loadTelegramEnv();
  if (!tg.effectiveToken) return;
  const db = new Database(dbPath);
  try {
    const r = await refreshKnownChats({
      db,
      token: tg.effectiveToken,
      filter: 'active',
    });
    console.log(`refresh: refreshed=${r.refreshed} failed=${r.failed}`);
  } finally {
    db.close();
  }
}

async function laneDiscover(opts: { stdout: boolean }): Promise<string> {
  const dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  const report = await discoverTelegramAssets({
    opsDbPath: dbPath,
    localOnly: false,
  });
  const path = `${OUT_DIR}/discovery.json`;
  await Bun.write(path, JSON.stringify(report, null, 2));
  const digest = formatDiscoveryDigest(report).join('\n') + '\n';
  await Bun.write(`${OUT_DIR}/discovery.md`, `# Telegram discovery\n\n\`\`\`\n${digest}\`\`\`\n`);
  if (opts.stdout) {
    for (const line of formatDiscoveryDigest(report)) console.log(line);
  }
  console.log(`✅ discovery → ${path}`);
  return path;
}

async function laneAudit(opts: { stdout: boolean }): Promise<string> {
  const dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  const db = new Database(dbPath);
  let canReadAll: boolean | null = null;
  const canManage: Record<string, boolean | null> = {};
  try {
    // Prefer discovery artifact if present (parallel-safe after discover finishes)
    const discFile = Bun.file(`${OUT_DIR}/discovery.json`);
    if (await discFile.exists()) {
      const disc = (await discFile.json()) as {
        bot?: { can_read_all_group_messages?: boolean };
        chats?: Array<{
          chatId?: string; // brand-ok — discovery JSON wire
          botMember?: { can_manage_topics?: boolean | null };
        }>;
      };
      canReadAll = disc.bot?.can_read_all_group_messages ?? null;
      for (const c of disc.chats ?? []) {
        if (c.chatId != null && c.botMember) {
          canManage[c.chatId] = c.botMember.can_manage_topics ?? null;
        }
      }
    } else {
      // Lightweight live probe via discover when audit runs alone
      const disc = await discoverTelegramAssets({ opsDbPath: dbPath, localOnly: false });
      canReadAll = disc.bot?.can_read_all_group_messages ?? null;
      for (const c of disc.chats) {
        canManage[c.chatId] = c.botMember?.can_manage_topics ?? null;
      }
    }

    const rows = listKnownChats(db, { filter: 'all', activeOnly: false, limit: 500 });
    const report = auditTelegramSurfaces({
      knownChats: rows,
      canReadAllGroupMessages: canReadAll,
      canManageTopicsByChat: canManage,
    });
    const path = `${OUT_DIR}/audit.json`;
    await Bun.write(path, JSON.stringify(report, null, 2));
    const digest = formatSurfaceAuditDigest(report).join('\n') + '\n';
    await Bun.write(`${OUT_DIR}/audit.md`, `# Telegram surface audit\n\n\`\`\`\n${digest}\`\`\`\n`);
    if (opts.stdout) {
      for (const line of formatSurfaceAuditDigest(report)) console.log(line);
    }
    console.log(`✅ audit → ${path} (ok=${report.summary.ok})`);
    return path;
  } finally {
    db.close();
  }
}

async function laneMap(opts: { stdout: boolean }): Promise<string> {
  const dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  const db = new Database(dbPath);
  try {
    const rows = listKnownChats(db, { filter: 'all', activeOnly: false, limit: 500 });
    const model = buildSurfaceGraph({ knownChats: rows });
    const path = `${OUT_DIR}/map.json`;
    await Bun.write(path, JSON.stringify(model, null, 2));
    const ascii = formatSurfaceGraphAscii(model).join('\n');
    const mermaid = formatSurfaceGraphMermaid(model);
    const envBlock = formatSurfaceGraphEnvBlock(model).join('\n');
    await Bun.write(
      `${OUT_DIR}/map.md`,
      [
        '# Telegram surface map',
        '',
        '## ASCII',
        '```',
        ascii,
        '```',
        '',
        '## Mermaid',
        '```mermaid',
        mermaid,
        '```',
        '',
        '## Suggested env',
        '```bash',
        envBlock,
        '```',
        '',
      ].join('\n')
    );
    await Bun.write(`${OUT_DIR}/map.mmd`, mermaid + '\n');
    await Bun.write(`${OUT_DIR}/suggested.env`, envBlock + '\n');
    if (opts.stdout) {
      for (const line of formatSurfaceGraphAscii(model)) console.log(line);
    }
    console.log(`✅ map → ${path}`);
    return path;
  } finally {
    db.close();
  }
}

async function writeSummary(): Promise<void> {
  const parts: string[] = [
    '# Telegram surface pipeline summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
  ];
  for (const name of ['discovery', 'audit', 'map'] as const) {
    const f = Bun.file(`${OUT_DIR}/${name}.json`);
    if (await f.exists()) {
      parts.push(`- [${name}](./${name}.md) · \`${name}.json\``);
    } else {
      parts.push(`- ${name}: (missing)`);
    }
  }
  const auditFile = Bun.file(`${OUT_DIR}/audit.json`);
  if (await auditFile.exists()) {
    const audit = (await auditFile.json()) as {
      summary: { ok: boolean; blockers: number; majors: number };
      findings: Array<{ severity: string; id: string; message: string; fix?: string }>; // brand-ok — audit finding id
    };
    parts.push('', '## Audit headline');
    parts.push(
      `ok=${audit.summary.ok} blockers=${audit.summary.blockers} majors=${audit.summary.majors}`
    );
    for (const f of audit.findings
      .filter(x => x.severity === 'blocker' || x.severity === 'major')
      .slice(0, 12)) {
      parts.push(`- **${f.id}**: ${f.message}${f.fix ? ` → ${f.fix}` : ''}`);
    }
  }
  const sug = Bun.file(`${OUT_DIR}/suggested.env`);
  if (await sug.exists()) {
    parts.push('', '## Suggested env', '```bash', await sug.text(), '```');
  }
  await Bun.write(`${OUT_DIR}/SUMMARY.md`, parts.join('\n') + '\n');
  console.log(`✅ summary → ${OUT_DIR}/SUMMARY.md`);
}

async function main(): Promise<void> {
  const opts = parseArgs(Bun.argv.slice(2));
  await ensureOut();
  if (opts.refresh) {
    const dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
    await maybeRefresh(dbPath);
  }

  if (opts.lane === 'discover') await laneDiscover(opts);
  else if (opts.lane === 'audit') await laneAudit(opts);
  else if (opts.lane === 'map') await laneMap(opts);
  else {
    await laneDiscover(opts);
    await laneAudit(opts);
    await laneMap(opts);
    await writeSummary();
  }

  if (opts.lane !== 'pipeline' && opts.lane !== 'discover') {
    // no-op
  }
  if (opts.lane === 'map' || opts.lane === 'audit') {
    const all =
      (await Bun.file(`${OUT_DIR}/discovery.json`).exists()) &&
      (await Bun.file(`${OUT_DIR}/audit.json`).exists()) &&
      (await Bun.file(`${OUT_DIR}/map.json`).exists());
    if (all) await writeSummary();
  }
}

if (import.meta.main) {
  await main();
}

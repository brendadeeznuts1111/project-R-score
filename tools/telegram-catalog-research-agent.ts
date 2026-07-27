#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram catalog research agent — deterministic analyzers + optional LLM pass.
 *
 *   bun run telegram:catalog:research
 *   bun run telegram:catalog:research --json
 *   bun run telegram:catalog:research --llm --write
 *   bun run telegram:catalog:research --partner SPEN ASH
 *
 * Output: reports/telegram/catalog-enhancements.json (with --write)
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import {
  exportCatalogEnhancementReport,
  formatCatalogEnhancementSummary,
  runCatalogResearchAgent,
} from '../lib/telegram/catalog-research/agent.ts';

const argv = Bun.argv.slice(2);
let wantJson = false;
let write = false;
let useLlm = false;
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
let forumsDir: string | undefined;
const partnerFilter: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--json') wantJson = true;
  else if (a === '--write' || a === '-o') write = true;
  else if (a === '--llm') useLlm = true;
  else if (a === '--db' && argv[i + 1]) dbPath = argv[++i]!;
  else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
  else if (a === '--forums-dir' && argv[i + 1]) forumsDir = argv[++i]!;
  else if (a.startsWith('--forums-dir=')) forumsDir = a.slice('--forums-dir='.length);
  else if (a === '--partner' && argv[i + 1]) {
    while (argv[i + 1] && !argv[i + 1]!.startsWith('-'))
      partnerFilter.push(argv[++i]!.toUpperCase());
  } else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/telegram-catalog-research-agent.ts [options]

Analyzes handshake catalog + live forum metadata → enhancement proposals.

Options:
  --write, -o           Write reports/telegram/catalog-enhancements.json
  --json                JSON to stdout (default human summary unless --write-only)
  --llm                 Optional LLM pass (OPENAI_API_KEY or TELEGRAM_CATALOG_RESEARCH_LLM_URL)
  --partner CODE…       Limit live forum scan to partners
  --forums-dir path     Default reports/telegram/forums
  --db path             Ops DB for package_group_registry

See docs/harness/tenants/partner-package-group-handshake.md § Forum topic plans
`);
    process.exit(0);
  }
}

const db = openOperationsDb({ path: dbPath });
try {
  const report = await runCatalogResearchAgent({
    db,
    forumsMetaDir: forumsDir,
    partnerCodes: partnerFilter.length ? partnerFilter : undefined,
    llm: useLlm,
    telegramNotes: [
      'Bot API forum topics support icon_color 0-6 on createForumTopic/editForumTopic.',
      'Partner General is always thread 1 — never createForumTopic.',
    ],
  });

  if (write) {
    const path = await exportCatalogEnhancementReport(report);
    console.error(`wrote ${path}`);
  }

  if (wantJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const line of formatCatalogEnhancementSummary(report)) console.log(line);
  }
} finally {
  db.close();
}

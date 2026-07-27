// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/guides/runtime/timezone — TZ
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram catalog research agent — orchestrator.
 *
 * Pipeline (cron worker):
 *   1. Load catalog snapshot (registry JSON or buildHandshakeCatalog)
 *   2. Gather external signals (Bot API probe + API notes)
 *   3. Deterministic analyzers + optional LLM pass
 *   4. Write structured changes → catalog-enhancements.json
 */
import type { Database } from 'bun:sqlite';
import { runDeterministicAnalyzers } from './analyzers.ts';
import { loadCatalogResearchContext } from './context.ts';
import { runLlmResearch } from './llm-pass.ts';
import { gatherCatalogResearchSignals, loadCatalogSnapshotForResearch } from './signals.ts';
import {
  CATALOG_ENHANCEMENT_SCHEMA,
  proposalToChange,
  type CatalogEnhancementReport,
  type CatalogEnhancementSeverity,
} from './types.ts';

export type RunCatalogResearchAgentOpts = {
  db?: Database;
  forumsMetaDir?: string;
  partnerCodes?: readonly string[];
  /** Call optional LLM pass when env configured (or force true/false). */
  llm?: boolean;
  telegramNotes?: readonly string[];
  root?: string;
};

function shouldRunLlm(explicit?: boolean): boolean {
  if (explicit === true) return true;
  if (explicit === false) return false;
  return Boolean(
    Bun.env.OPENAI_API_KEY?.trim() || Bun.env.TELEGRAM_CATALOG_RESEARCH_LLM_URL?.trim()
  );
}

export async function runCatalogResearchAgent(
  opts: RunCatalogResearchAgentOpts = {}
): Promise<CatalogEnhancementReport> {
  const root = opts.root ?? process.cwd();

  // 1. Load catalog snapshot
  const { catalog, path: catalogPath, loadedFrom } = await loadCatalogSnapshotForResearch(root);

  // 2. External signals
  const signals = await gatherCatalogResearchSignals({
    root,
    catalog,
    catalogPath,
    catalogLoadedFrom: loadedFrom,
  });

  const { context } = await loadCatalogResearchContext({
    db: opts.db,
    forumsMetaDir: opts.forumsMetaDir,
    partnerCodes: opts.partnerCodes,
  });

  // 3a. Deterministic analyzers (always)
  const deterministic = runDeterministicAnalyzers(catalog, context);

  // 3b. Optional LLM
  const runLlm = shouldRunLlm(opts.llm);
  let llmBlock: CatalogEnhancementReport['llm'];
  let llmProposals = [...deterministic];

  if (runLlm) {
    const llmNotes = [
      ...(opts.telegramNotes ?? []),
      ...signals.apiNotes,
      ...signals.changelog.notes,
      ...(signals.botApi.customEmojiProbe ? [signals.botApi.customEmojiProbe.note] : []),
    ];
    const llm = await runLlmResearch({
      catalog,
      deterministic,
      telegramNotes: llmNotes,
    });
    llmBlock = {
      model: llm.model,
      proposalCount: llm.proposals.length,
      skipped: llm.skipped,
    };
    llmProposals = [...deterministic, ...llm.proposals];
  } else {
    llmBlock = {
      model: 'none',
      proposalCount: 0,
      skipped: 'LLM disabled (set OPENAI_API_KEY or pass llm:true)',
    };
  }

  const proposals = llmProposals;
  const changes = proposals.map(proposalToChange);

  const bySeverity: Record<CatalogEnhancementSeverity, number> = {
    action: 0,
    recommendation: 0,
    info: 0,
  };
  for (const p of proposals) bySeverity[p.severity]++;

  const generatedAt = new Date().toISOString();

  return {
    schema: CATALOG_ENHANCEMENT_SCHEMA,
    meta: {
      timestamp: generatedAt,
      reason: 'Daily catalog research — deterministic analyzers + optional LLM architect pass',
      catalogPath,
      catalogSchema: catalog.schema,
      catalogGeneratedAt: catalog.generatedAt,
      systemTimeZone: signals.systemTimeZone,
    },
    catalog: {
      schema: catalog.schema,
      generatedAt: catalog.generatedAt,
      packageForumTopics: catalog.packageForumTopics,
      houseForumTopics: catalog.houseForumTopics,
    },
    signals,
    changes,
    generatedAt,
    catalogSchema: catalog.schema,
    catalogGeneratedAt: catalog.generatedAt,
    sources: [
      catalogPath,
      context.forumsMetaDir,
      'lib/telegram/handshake-catalog.ts',
      'lib/telegram/catalog-research/analyzers.ts',
      'lib/telegram/catalog-research/signals.ts',
      ...(runLlm && !llmBlock?.skipped ? ['llm-pass'] : []),
    ],
    proposalCount: proposals.length,
    bySeverity,
    proposals,
    llm: llmBlock,
  };
}

export async function exportCatalogEnhancementReport(
  report: CatalogEnhancementReport,
  root = process.cwd()
): Promise<string> {
  const rel = 'reports/telegram/catalog-enhancements.json';
  const abs = root.endsWith('/') ? `${root}${rel}` : `${root}/${rel}`;
  const dir = abs.slice(0, abs.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  await Bun.write(abs, `${JSON.stringify(report, null, 2)}\n`);
  return abs;
}

export function formatCatalogEnhancementSummary(report: CatalogEnhancementReport): string[] {
  const lines = [
    `${report.schema} · ${report.proposalCount} changes`,
    `  action=${report.bySeverity.action} recommendation=${report.bySeverity.recommendation} info=${report.bySeverity.info}`,
    `  catalog ${report.catalogSchema} @ ${report.catalogGeneratedAt}`,
    `  TZ ${report.meta.systemTimeZone}`,
  ];
  if (report.llm?.skipped) lines.push(`  llm: skipped (${report.llm.skipped})`);
  else if (report.llm && report.llm.proposalCount > 0) {
    lines.push(`  llm: ${report.llm.model} +${report.llm.proposalCount}`);
  }
  lines.push('');
  for (const c of report.changes.slice(0, 30)) {
    lines.push(`  [${c.severity}] ${c.title}`);
    if (c.applyCommand) lines.push(`    → ${c.applyCommand}`);
  }
  if (report.changes.length > 30) {
    lines.push(`  … +${report.changes.length - 30} more (see JSON)`);
  }
  return lines;
}

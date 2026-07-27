// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — in-process complement
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Daily catalog research cycle — shared by OS cron worker and --once CLI.
 *
 *   bun lib/telegram/catalog-research/cron.ts --once
 *   bun run telegram:catalog:research:once
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../../operations/db.ts';
import { applyCatalogEnhancements } from './apply.ts';
import {
  exportCatalogEnhancementReport,
  formatCatalogEnhancementSummary,
  runCatalogResearchAgent,
} from './agent.ts';
import { TELEGRAM_CATALOG_RESEARCH_CRON_TITLE } from './constants.ts';
import { loadReasonixEnv } from './load-reasonix-env.ts';

export type CatalogResearchCycleOpts = {
  dbPath?: string;
  forumsMetaDir?: string;
  /** undefined = auto when OPENAI_API_KEY set */
  llm?: boolean;
  applySafe?: boolean;
};

export type CatalogResearchCycleResult = {
  code: number;
  path?: string;
  proposalCount?: number;
  error?: string;
};

export async function runCatalogResearchCycle(
  opts: CatalogResearchCycleOpts = {}
): Promise<CatalogResearchCycleResult> {
  await loadReasonixEnv();

  const dbPath = opts.dbPath?.trim() || Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
  const db = openOperationsDb({ path: dbPath });
  try {
    const report = await runCatalogResearchAgent({
      db,
      forumsMetaDir: opts.forumsMetaDir,
      llm: opts.llm,
    });
    const path = await exportCatalogEnhancementReport(report);
    console.info(
      `[${TELEGRAM_CATALOG_RESEARCH_CRON_TITLE}] wrote ${path} · changes=${report.proposalCount} action=${report.bySeverity.action}`
    );
    for (const line of formatCatalogEnhancementSummary(report).slice(0, 10)) {
      console.info(`  ${line}`);
    }

    const applySafe =
      opts.applySafe === true || Bun.env.TELEGRAM_CATALOG_RESEARCH_APPLY_SAFE === '1';
    if (applySafe) {
      const applied = await applyCatalogEnhancements({ safeOnly: true });
      if (applied.applied > 0) {
        console.info(
          `[${TELEGRAM_CATALOG_RESEARCH_CRON_TITLE}] applied ${applied.applied} safe overrides`
        );
      }
    }

    return { code: 0, path, proposalCount: report.proposalCount };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[${TELEGRAM_CATALOG_RESEARCH_CRON_TITLE}] failed:`, error);
    return { code: 1, error };
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  const llm = Bun.argv.includes('--llm') ? true : Bun.argv.includes('--no-llm') ? false : undefined;
  const applySafe = Bun.argv.includes('--apply-safe');
  const { code } = await runCatalogResearchCycle({ llm, applySafe });
  process.exit(code);
}

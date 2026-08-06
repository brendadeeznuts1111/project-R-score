// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { joinPath } from '../path-bun.ts';

/** FactoryWager / project-R-score repo root (lib/operator-research → ../..). */
export const ROOT = joinPath(import.meta.dir, '../..');

export const OPERATORS_GLOB = 'config/operators/*.toml';
export const DEFAULT_SEEDS_PATH = joinPath(ROOT, 'config/operator-research/seeds.json');
export const DATA_DIR = joinPath(ROOT, 'data/operator-research');
export const EVIDENCE_DIR = joinPath(DATA_DIR, 'evidence');
export const SCREENSHOTS_DIR = joinPath(DATA_DIR, 'screenshots');
export const EXPORTS_DIR = joinPath(ROOT, 'data/exports');
export const DB_PATH = joinPath(DATA_DIR, 'evidence.db');
export const FIXTURES_DIR = joinPath(import.meta.dir, 'fixtures');

export const BATCH_ENRICH_EXPORT = joinPath(EXPORTS_DIR, 'batch-enrich.json');
export const DETECT_STACK_EXPORT = joinPath(EXPORTS_DIR, 'detect-stack.json');
export const COVERAGE_REPORT_MD = joinPath(EXPORTS_DIR, 'coverage-report.md');
export const COVERAGE_REPORT_JSON = joinPath(EXPORTS_DIR, 'coverage-report.json');
export const ODDS_EDGES_EXPORT = joinPath(EXPORTS_DIR, 'odds-edges.json');

export async function ensureResearchDirs(): Promise<void> {
  await Promise.all([
    Bun.write(joinPath(EVIDENCE_DIR, '.gitkeep'), ''),
    Bun.write(joinPath(SCREENSHOTS_DIR, '.gitkeep'), ''),
    Bun.write(joinPath(EXPORTS_DIR, '.gitkeep'), ''),
    Bun.write(joinPath(DATA_DIR, 'odds-snapshots', '.gitkeep'), ''),
  ]);
}

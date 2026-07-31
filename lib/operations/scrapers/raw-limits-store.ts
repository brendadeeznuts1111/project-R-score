// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
/**
 * Append-only JSONL store for Tier 4 scrape observations.
 *
 * Path: artifacts/raw-limits/{sportsbook}.jsonl
 *
 * @see https://bun.com/docs/api/file-io — Bun.file / Bun.write
 * @see docs/harness/tenants/partner-limits.md
 */

import { joinPath } from '../../path-bun.ts';
import { parseSportsbookId, type SportsbookId } from './domain.ts';
import {
  observationCellKey,
  parseLimitObservationFromUnknown,
  type LimitObservation,
} from './limit-observation-wire.ts';

export const RAW_LIMITS_DIR_REL = 'artifacts/raw-limits';

export function rawLimitsDir(root: string): string {
  return joinPath(root, RAW_LIMITS_DIR_REL);
}

export function rawLimitsPath(root: string, sportsbook: string): string {
  return joinPath(rawLimitsDir(root), `${sportsbook}.jsonl`);
}

export function healthPath(root: string): string {
  return joinPath(rawLimitsDir(root), 'health.json');
}

async function ensureDir(dir: string): Promise<void> {
  await Bun.$`mkdir -p ${dir}`.quiet();
}

export async function appendLimitObservations(
  root: string,
  sportsbook: string,
  observations: readonly LimitObservation[]
): Promise<{ path: string; appended: number }> {
  const path = rawLimitsPath(root, sportsbook);
  if (observations.length === 0) {
    return { path, appended: 0 };
  }
  await ensureDir(rawLimitsDir(root));
  const file = Bun.file(path);
  const prior = (await file.exists()) ? await file.text() : '';
  const body = observations.map(obs => JSON.stringify(obs)).join('\n') + '\n';
  await Bun.write(path, prior + body);
  return { path, appended: observations.length };
}

export async function readLimitObservations(
  root: string,
  sportsbook: string
): Promise<LimitObservation[]> {
  const path = rawLimitsPath(root, sportsbook);
  const file = Bun.file(path);
  if (!(await file.exists())) return [];
  const text = await file.text();
  const rows: LimitObservation[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(parseLimitObservationFromUnknown(JSON.parse(trimmed) as unknown));
    } catch {
      // skip corrupt lines
    }
  }
  return rows;
}

/** Latest observation per cell key (sportsbook×sport×market×jurisdiction×structure×phase). */
export function latestObservationsByCell(
  observations: readonly LimitObservation[]
): LimitObservation[] {
  const map = new Map<string, LimitObservation>();
  for (const obs of observations) {
    const key = observationCellKey(obs);
    const prior = map.get(key);
    if (!prior || prior.observedAt <= obs.observedAt) map.set(key, obs);
  }
  return [...map.values()];
}

export type ScrapeAgentHealthEntry = {
  /** Registry key — same as sportsbook slug. */
  bookId: SportsbookId;
  /** @deprecated Prefer bookId — kept for older health.json readers. */
  sportsbook: string;
  ok: boolean;
  mode: LimitObservation['mode'] | 'idle';
  observationCount: number;
  latestCount: number;
  lastObservedAt: string | null;
  lastError: string | null;
  jsonlPath: string;
};

export type ScrapeAgentHealthReport = {
  generatedAt: string;
  books: ScrapeAgentHealthEntry[];
};

export async function writeScrapeAgentHealth(
  root: string,
  report: ScrapeAgentHealthReport
): Promise<string> {
  await ensureDir(rawLimitsDir(root));
  const path = healthPath(root);
  await Bun.write(path, `${JSON.stringify(report, null, 2)}\n`);
  return path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`ScrapeAgentHealthEntry: invalid ${field}`);
  }
  return value;
}

function parseNullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return parseRequiredString(value, field);
}

function parseNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`ScrapeAgentHealthEntry: invalid ${field}`);
  }
  return value;
}

function parseHealthMode(value: unknown): ScrapeAgentHealthEntry['mode'] {
  if (value === 'idle' || value === 'fixture' || value === 'live' || value === 'html_stub') {
    return value;
  }
  throw new Error('ScrapeAgentHealthEntry: invalid mode');
}

function parseScrapeAgentHealthEntry(value: unknown): ScrapeAgentHealthEntry {
  if (!isRecord(value)) throw new Error('ScrapeAgentHealthEntry: expected object');
  const sportsbook = parseRequiredString(value.sportsbook ?? value.bookId, 'sportsbook');
  return {
    bookId: parseSportsbookId(value.bookId ?? sportsbook),
    sportsbook,
    ok: value.ok === true,
    mode: parseHealthMode(value.mode),
    observationCount: parseNonNegativeInteger(value.observationCount, 'observationCount'),
    latestCount: parseNonNegativeInteger(value.latestCount, 'latestCount'),
    lastObservedAt: parseNullableString(value.lastObservedAt, 'lastObservedAt'),
    lastError: parseNullableString(value.lastError, 'lastError'),
    jsonlPath: parseRequiredString(value.jsonlPath, 'jsonlPath'),
  };
}

export async function readScrapeAgentHealth(root: string): Promise<ScrapeAgentHealthReport | null> {
  const path = healthPath(root);
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  const value: unknown = await file.json();
  if (!isRecord(value) || typeof value.generatedAt !== 'string' || !Array.isArray(value.books)) {
    throw new Error('ScrapeAgentHealthReport: expected generatedAt and books');
  }
  return {
    generatedAt: value.generatedAt,
    books: value.books.map(parseScrapeAgentHealthEntry),
  };
}

export async function healthEntryForBook(
  root: string,
  sportsbook: string,
  opts?: { ok?: boolean; mode?: LimitObservation['mode']; lastError?: string | null }
): Promise<ScrapeAgentHealthEntry> {
  const all = await readLimitObservations(root, sportsbook);
  const latest = latestObservationsByCell(all);
  const lastObservedAt =
    all.length === 0
      ? null
      : all.reduce((max, row) => (row.observedAt > max ? row.observedAt : max), all[0]!.observedAt);
  return {
    bookId: parseSportsbookId(sportsbook),
    sportsbook,
    ok: opts?.ok ?? all.length > 0,
    mode: opts?.mode ?? latest[0]?.mode ?? 'idle',
    observationCount: all.length,
    latestCount: latest.length,
    lastObservedAt,
    lastError: opts?.lastError ?? null,
    jsonlPath: `${RAW_LIMITS_DIR_REL}/${sportsbook}.jsonl`,
  };
}

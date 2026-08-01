#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Verify glossary board routes, hash patterns, and DOM section mounts.
 *   bun run glossary:verify
 *   bun run glossary:verify --json
 *   bun run glossary:verify --strict   # also fail on section-shaped orphan ids
 *   bun run glossary:verify --dry-run  # report the verdict but never fail the exit code
 *
 * Offline probe: reads public/registry/domain-glossary.json and:
 *   1. Proves every section hash round-trips through URLPattern (#section:{hash})
 *   2. Scrapes each board HTML with HTMLRewriter:
 *      - every bake `domId` must exist
 *      - duplicate ids on a board fail (getElementById only reaches the first)
 *      - section-shaped orphans (`section:*` · `ad-section-*`) report as WARN;
 *        with `--strict` they fail (stale mounts left after rename)
 *
 * GUI note: glossary-ux scrolls via document.getElementById(domId) — colon-safe.
 * Do not use querySelector(`#${domId}`) for `section:…` ids (CSS pseudo delimiter).
 *
 * @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
 * @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
 * @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
 * @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
 * @see https://bun.com/reference/bun/argv — Bun.argv
 */

import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { jsonOut } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';

export type Status = 'LIVE' | 'STALE' | 'WARN';

const statusColorMap: Record<Status, string> = {
  LIVE: 'lime',
  STALE: 'red',
  WARN: 'yellow',
};

export function coloredStatus(status: Status): string {
  // Bun.color(..., 'ansi') can return '' on some builds — use ansi-16 + fallback
  // (precedent: tools/portal-probe.ts).
  const ansi = (Bun.color(statusColorMap[status], 'ansi-16') as string) || '';
  return ansi ? `${ansi}${status}\x1b[0m` : status;
}

// Hash-plane patterns — literal colon escaped (`\\:`); a bare `:` starts a named
// parameter and Bun's URLPattern parser throws "Name position … is less than
// name start …". Same dialect as public/portal/components/glossary-ux.js.
export const glossaryPattern = new URLPattern({ hash: 'glossary\\::concept' });
export const sectionPattern = new URLPattern({ hash: 'section\\::section' });

export interface GlossarySection {
  hash?: string;
  domId?: string;
  conceptId?: string;
  /** Human heading from page-glossary bake (phase 1). */
  title?: string;
}

export interface GlossarySurface {
  path?: string;
  concept?: string;
  sections?: GlossarySection[];
}

export interface GlossaryBake {
  schemaVersion?: number;
  surfaces?: GlossarySurface[];
}

export interface HashCheckResult {
  hashOk: number;
  hashFail: number;
  failures: string[];
}

export interface DomIdMiss {
  path: string;
  hash: string;
  domId: string;
  reason: 'missing-file' | 'missing-id';
  file: string;
}

export interface DomIdDuplicate {
  path: string;
  file: string;
  domId: string;
  count: number;
}

export interface DomIdOrphan {
  path: string;
  file: string;
  domId: string;
  /** section:* / ad-section-* → section-shaped; else chrome */
  kind: 'section-shaped' | 'chrome';
}

export interface DomIdCheckResult {
  domOk: number;
  domFail: number;
  boardsScanned: number;
  misses: DomIdMiss[];
  duplicates: DomIdDuplicate[];
  orphans: DomIdOrphan[];
  /** Non-manifest ids that look like glossary mounts (strict cares about these). */
  sectionOrphans: DomIdOrphan[];
  /** Other page chrome ids not in the bake (reported only; never fail alone). */
  chromeOrphans: number;
}

export interface IdOccurrenceReport {
  /** Unique id values present at least once. */
  unique: Set<string>;
  /** Document-order list (multiplicity preserved). */
  ordered: string[];
  /** Ids that appear more than once (unique list). */
  duplicates: string[];
  counts: Map<string, number>;
}

/**
 * Map surface path `/portal/limits/` → `public/portal/limits/index.html` (repo-relative).
 */
export function boardHtmlRelPath(surfacePath: string): string {
  const trimmed = surfacePath.trim();
  const noLead = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const dir = noLead.endsWith('/') ? noLead : `${noLead}/`;
  return joinPath('public', dir, 'index.html');
}

/** Glossary / dossier section mount shapes (not general chrome like `tenant-sidebar`). */
export function isSectionShapedDomId(id: string): boolean {
  return id.startsWith('section:') || id.startsWith('ad-section-');
}

/**
 * Collect every element `id` from an HTML document via HTMLRewriter.
 * Attribute selector works for ids that contain `:` (e.g. `section:telegram`).
 * Tracks multiplicity so duplicate ids are visible (invalid HTML / dead anchors).
 */
export async function scrapeElementIds(html: string | Response): Promise<IdOccurrenceReport> {
  const ordered: string[] = [];
  const counts = new Map<string, number>();
  const input = typeof html === 'string' ? new Response(html) : html;
  await new HTMLRewriter()
    .on('*[id]', {
      element(el) {
        const id = el.getAttribute('id');
        if (!id) return;
        ordered.push(id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      },
    })
    .transform(input)
    .arrayBuffer();

  const unique = new Set(counts.keys());
  const duplicates = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  return { unique, ordered, duplicates, counts };
}

/** Unique set only (compat). Prefer {@link scrapeElementIds} when multiplicity matters. */
export async function collectElementIds(html: string | Response): Promise<Set<string>> {
  const report = await scrapeElementIds(html);
  return report.unique;
}

/** Prove #section:{hash} URLPattern round-trips for every baked section. */
export function verifySectionHashes(surfaces: GlossarySurface[]): HashCheckResult {
  let hashOk = 0;
  let hashFail = 0;
  const failures: string[] = [];
  for (const surface of surfaces) {
    const path = surface.path || '/';
    for (const section of surface.sections ?? []) {
      if (!section.hash) continue;
      const testUrl = `https://score.factory-wager.com${path}#section:${section.hash}`;
      const match = sectionPattern.exec(testUrl);
      if (match && match.hash.groups.section === section.hash) hashOk++;
      else {
        hashFail++;
        failures.push(`${path}#section:${section.hash}`);
      }
    }
  }
  return { hashOk, hashFail, failures };
}

/**
 * Diff expected bake domIds against HTMLRewriter scrape for one document.
 * Pure helper for unit tests and {@link verifyDomIds}.
 */
export function diffDomIds(
  expectedIds: string[],
  scrape: IdOccurrenceReport
): {
  present: string[];
  missing: string[];
  duplicates: Array<{ domId: string; count: number }>;
  sectionOrphans: string[];
  chromeOrphans: string[];
} {
  const expected = new Set(expectedIds.filter(Boolean));
  const present: string[] = [];
  const missing: string[] = [];
  for (const id of expected) {
    if (scrape.unique.has(id)) present.push(id);
    else missing.push(id);
  }

  const duplicates = scrape.duplicates.map(domId => ({
    domId,
    count: scrape.counts.get(domId) ?? 0,
  }));

  const sectionOrphans: string[] = [];
  const chromeOrphans: string[] = [];
  for (const id of scrape.unique) {
    if (expected.has(id)) continue;
    if (isSectionShapedDomId(id)) sectionOrphans.push(id);
    else chromeOrphans.push(id);
  }

  return { present, missing, duplicates, sectionOrphans, chromeOrphans };
}

/**
 * For each section with a `domId`, load the board HTML and assert the id exists.
 * Also flags duplicate ids and section-shaped orphans (stale mounts).
 * Offline — reads local public/ files only (no network).
 */
export async function verifyDomIds(
  surfaces: GlossarySurface[],
  root: string
): Promise<DomIdCheckResult> {
  let domOk = 0;
  let domFail = 0;
  const misses: DomIdMiss[] = [];
  const duplicates: DomIdDuplicate[] = [];
  const orphans: DomIdOrphan[] = [];
  const sectionOrphans: DomIdOrphan[] = [];
  let chromeOrphans = 0;

  type CacheEntry = IdOccurrenceReport | null;
  const idCache = new Map<string, CacheEntry>();

  async function scrapeFor(
    surfacePath: string
  ): Promise<{ file: string; scrape: IdOccurrenceReport | null }> {
    const rel = boardHtmlRelPath(surfacePath);
    const file = joinPath(root, rel);
    if (idCache.has(file)) {
      return { file, scrape: idCache.get(file) ?? null };
    }
    const bf = Bun.file(file);
    if (!(await bf.exists())) {
      idCache.set(file, null);
      return { file, scrape: null };
    }
    const scrape = await scrapeElementIds(await bf.text());
    idCache.set(file, scrape);
    return { file, scrape };
  }

  for (const surface of surfaces) {
    const path = surface.path;
    if (!path) continue;
    const sections = (surface.sections ?? []).filter(s => s.domId);
    if (!sections.length) continue;

    const expectedIds = sections.map(s => s.domId!).filter(Boolean);
    const { file, scrape } = await scrapeFor(path);

    if (!scrape) {
      for (const section of sections) {
        domFail++;
        misses.push({
          path,
          hash: section.hash ?? '',
          domId: section.domId!,
          reason: 'missing-file',
          file,
        });
      }
      continue;
    }

    const diff = diffDomIds(expectedIds, scrape);

    for (const id of diff.present) {
      domOk++;
      void id;
    }
    for (const section of sections) {
      const domId = section.domId!;
      if (!scrape.unique.has(domId)) {
        domFail++;
        misses.push({
          path,
          hash: section.hash ?? '',
          domId,
          reason: 'missing-id',
          file,
        });
      }
    }

    for (const d of diff.duplicates) {
      duplicates.push({ path, file, domId: d.domId, count: d.count });
    }
    for (const id of diff.sectionOrphans) {
      const row: DomIdOrphan = { path, file, domId: id, kind: 'section-shaped' };
      orphans.push(row);
      sectionOrphans.push(row);
    }
    chromeOrphans += diff.chromeOrphans.length;
    for (const id of diff.chromeOrphans) {
      orphans.push({ path, file, domId: id, kind: 'chrome' });
    }
  }

  return {
    domOk,
    domFail,
    boardsScanned: idCache.size,
    misses,
    duplicates,
    orphans,
    sectionOrphans,
    chromeOrphans,
  };
}

export async function runGlossaryVerify(opts: {
  root: string;
  glossary?: GlossaryBake;
  json?: boolean;
  /** Fail when section-shaped orphan ids remain in HTML (stale mounts). */
  strict?: boolean;
  /** Report the verdict table but force exit code 0 (watch/explore flows). */
  dryRun?: boolean;
}): Promise<{
  exitCode: number;
  hash: HashCheckResult;
  dom: DomIdCheckResult;
  schemaVersion: number | undefined;
  surfaces: number;
  strict: boolean;
}> {
  const glossary =
    opts.glossary ??
    ((await Bun.file(
      joinPath(opts.root, 'public/registry/domain-glossary.json')
    ).json()) as GlossaryBake);

  const surfaces = glossary.surfaces ?? [];
  const hash = verifySectionHashes(surfaces);
  const dom = await verifyDomIds(surfaces, opts.root);
  const strict = opts.strict === true;
  const dryRun = opts.dryRun === true;

  const rows: Array<{ check: string; plane: string; status: string; detail: string }> = [];

  rows.push({
    check: 'glossary schema version',
    plane: 'public',
    status: coloredStatus(glossary.schemaVersion === 3 ? 'LIVE' : 'STALE'),
    detail: `schemaVersion=${glossary.schemaVersion}`,
  });

  const conceptProbe = glossaryPattern.exec(
    'https://score.factory-wager.com/portal/glossary/#glossary:ops.view.account_net'
  );
  rows.push({
    check: 'glossary concept pattern',
    plane: 'public',
    status: coloredStatus(
      conceptProbe?.hash.groups.concept === 'ops.view.account_net' ? 'LIVE' : 'STALE'
    ),
    detail: '#glossary:ops.view.account_net',
  });

  rows.push({
    check: 'glossary section hash patterns',
    plane: 'public',
    status: coloredStatus(hash.hashFail === 0 ? 'LIVE' : 'WARN'),
    detail:
      `${hash.hashOk} ok, ${hash.hashFail} unparseable` +
      (hash.failures.length ? ` — first: ${hash.failures[0]}` : ''),
  });

  const firstMiss = dom.misses[0];
  rows.push({
    check: 'glossary section DOM ids (HTMLRewriter)',
    plane: 'public',
    status: coloredStatus(dom.domFail === 0 ? 'LIVE' : 'STALE'),
    detail:
      `${dom.domOk} present, ${dom.domFail} missing · boards=${dom.boardsScanned}` +
      (firstMiss ? ` — first: ${firstMiss.path}#${firstMiss.domId} (${firstMiss.reason})` : ''),
  });

  const firstDup = dom.duplicates[0];
  rows.push({
    check: 'glossary DOM id uniqueness',
    plane: 'public',
    status: coloredStatus(dom.duplicates.length === 0 ? 'LIVE' : 'STALE'),
    detail:
      dom.duplicates.length === 0
        ? 'no duplicate ids on governed boards'
        : `${dom.duplicates.length} duplicate id(s) — first: ${firstDup?.path}#${firstDup?.domId} ×${firstDup?.count}`,
  });

  const firstSecOrphan = dom.sectionOrphans[0];
  const orphanStatus: Status = dom.sectionOrphans.length === 0 ? 'LIVE' : strict ? 'STALE' : 'WARN';
  rows.push({
    check: `glossary section-shaped orphans${strict ? ' (strict)' : ''}`,
    plane: 'public',
    status: coloredStatus(orphanStatus),
    detail:
      `section-shaped=${dom.sectionOrphans.length} · chrome-unlisted=${dom.chromeOrphans}` +
      (firstSecOrphan
        ? ` — first: ${firstSecOrphan.path}#${firstSecOrphan.domId}`
        : ' (chrome ids are expected outside the bake)'),
  });

  let md = '| Check | Plane | Status | Detail |\n| :--- | :--- | :--- | :--- |\n';
  for (const row of rows) md += `| ${row.check} | ${row.plane} | ${row.status} | ${row.detail} |\n`;

  const title = dryRun
    ? '# Glossary Route Verification (dry-run — exit code forced 0)'
    : '# Glossary Route Verification';
  const output = Bun.markdown.ansi(`${title}\n\n${md}`);
  console.log(output);

  if (opts.json) {
    jsonOut({
      schemaVersion: glossary.schemaVersion,
      surfaces: surfaces.length,
      strict,
      hashOk: hash.hashOk,
      hashFail: hash.hashFail,
      failures: hash.failures,
      domOk: dom.domOk,
      domFail: dom.domFail,
      boardsScanned: dom.boardsScanned,
      misses: dom.misses,
      duplicates: dom.duplicates,
      sectionOrphans: dom.sectionOrphans,
      chromeOrphans: dom.chromeOrphans,
    });
  }

  const exitCode =
    !dryRun &&
    (hash.hashFail > 0 ||
      dom.domFail > 0 ||
      dom.duplicates.length > 0 ||
      (strict && dom.sectionOrphans.length > 0))
      ? 1
      : 0;

  return {
    exitCode,
    hash,
    dom,
    schemaVersion: glossary.schemaVersion,
    surfaces: surfaces.length,
    strict,
  };
}

async function main(): Promise<void> {
  const root = joinPath(import.meta.dir, '..');
  const result = await runGlossaryVerify({
    root,
    json: Bun.argv.includes('--json'),
    strict: Bun.argv.includes('--strict'),
    dryRun: Bun.argv.includes('--dry-run'),
  });
  if (result.exitCode !== 0) process.exit(result.exitCode);
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

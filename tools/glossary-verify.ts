#!/usr/bin/env bun
/**
 * Verify glossary board routes, hash patterns, and DOM section mounts.
 *   bun run glossary:verify
 *   bun run glossary:verify --json
 *
 * Offline probe: reads public/registry/domain-glossary.json and:
 *   1. Proves every section hash round-trips through URLPattern (#section:{hash})
 *   2. Scrapes each board HTML with HTMLRewriter and asserts every `domId` exists
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

export interface DomIdCheckResult {
  domOk: number;
  domFail: number;
  boardsScanned: number;
  misses: DomIdMiss[];
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

/**
 * Collect every element `id` from an HTML document via HTMLRewriter.
 * Attribute selector works for ids that contain `:` (e.g. `section:telegram`).
 */
export async function collectElementIds(html: string | Response): Promise<Set<string>> {
  const found = new Set<string>();
  const input = typeof html === 'string' ? new Response(html) : html;
  await new HTMLRewriter()
    .on('*[id]', {
      element(el) {
        const id = el.getAttribute('id');
        if (id) found.add(id);
      },
    })
    .transform(input)
    .arrayBuffer();
  return found;
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
 * For each section with a `domId`, load the board HTML and assert the id exists.
 * Offline — reads local public/ files only (no network).
 */
export async function verifyDomIds(
  surfaces: GlossarySurface[],
  root: string
): Promise<DomIdCheckResult> {
  let domOk = 0;
  let domFail = 0;
  const misses: DomIdMiss[] = [];
  const idCache = new Map<string, Set<string> | null>();

  async function idsFor(surfacePath: string): Promise<{ file: string; ids: Set<string> | null }> {
    const rel = boardHtmlRelPath(surfacePath);
    const file = joinPath(root, rel);
    if (idCache.has(file)) {
      return { file, ids: idCache.get(file) ?? null };
    }
    const bf = Bun.file(file);
    if (!(await bf.exists())) {
      idCache.set(file, null);
      return { file, ids: null };
    }
    const ids = await collectElementIds(await bf.text());
    idCache.set(file, ids);
    return { file, ids };
  }

  for (const surface of surfaces) {
    const path = surface.path;
    if (!path) continue;
    const sections = (surface.sections ?? []).filter(s => s.domId);
    if (!sections.length) continue;

    const { file, ids } = await idsFor(path);
    if (!ids) {
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

    for (const section of sections) {
      const domId = section.domId!;
      if (ids.has(domId)) {
        domOk++;
      } else {
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
  }

  return {
    domOk,
    domFail,
    boardsScanned: idCache.size,
    misses,
  };
}

export async function runGlossaryVerify(opts: {
  root: string;
  glossary?: GlossaryBake;
  json?: boolean;
}): Promise<{
  exitCode: number;
  hash: HashCheckResult;
  dom: DomIdCheckResult;
  schemaVersion: number | undefined;
  surfaces: number;
}> {
  const glossary =
    opts.glossary ??
    ((await Bun.file(joinPath(opts.root, 'public/registry/domain-glossary.json')).json()) as GlossaryBake);

  const surfaces = glossary.surfaces ?? [];
  const hash = verifySectionHashes(surfaces);
  const dom = await verifyDomIds(surfaces, opts.root);

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
      (firstMiss
        ? ` — first: ${firstMiss.path}#${firstMiss.domId} (${firstMiss.reason})`
        : ''),
  });

  let md = '| Check | Plane | Status | Detail |\n| :--- | :--- | :--- | :--- |\n';
  for (const row of rows) md += `| ${row.check} | ${row.plane} | ${row.status} | ${row.detail} |\n`;

  const output = Bun.markdown.ansi(`# Glossary Route Verification\n\n${md}`);
  console.log(output);

  if (opts.json) {
    jsonOut({
      schemaVersion: glossary.schemaVersion,
      surfaces: surfaces.length,
      hashOk: hash.hashOk,
      hashFail: hash.hashFail,
      failures: hash.failures,
      domOk: dom.domOk,
      domFail: dom.domFail,
      boardsScanned: dom.boardsScanned,
      misses: dom.misses,
    });
  }

  const exitCode = hash.hashFail > 0 || dom.domFail > 0 ? 1 : 0;
  return {
    exitCode,
    hash,
    dom,
    schemaVersion: glossary.schemaVersion,
    surfaces: surfaces.length,
  };
}

async function main(): Promise<void> {
  const root = joinPath(import.meta.dir, '..');
  const result = await runGlossaryVerify({
    root,
    json: Bun.argv.includes('--json'),
  });
  if (result.exitCode !== 0) process.exit(result.exitCode);
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// scripts/validate-surface-coverage.ts — cross-page surface-coverage gate.
//
// Scans every portal page's HTML/JS for `data-glossary-concept="…"` usages and
// verifies them against (1) the page's SURFACE_CONCEPTS allowlist and (2) the
// canonical domain glossary. Catches the drift class that slips per-page gates:
//   ORPHAN  — a concept used on the page but missing from its surface allowlist
//   UNKNOWN — a concept used on the page but not in the canonical glossary
// Unwired allowlist entries (never referenced in chrome) are reported as
// warnings — the strict checks are the orphans/unknowns.
//
//   bun run validate:surface-coverage
//
// @see lib/portal/semantic-vocabulary.ts — surface constants

import { joinPath } from '../lib/path-bun';
import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
} from '../lib/portal/semantic-vocabulary.ts';
import { PARTNER_HISTORY_GLOSSARY } from '../public/portal/partner-history/glossary-map.js';
import { ACCOUNT_DOSSIER_GLOSSARY } from '../public/portal/account/glossary-map.js';

/** Resolve the page's `G.<key>` shorthand to a concept id (undefined = broken). */
export type ShorthandResolver = (key: string) => string | undefined;

const partnerHistoryResolver: ShorthandResolver = key =>
  PARTNER_HISTORY_GLOSSARY[key as keyof typeof PARTNER_HISTORY_GLOSSARY] as string | undefined;
const accountResolver: ShorthandResolver = key =>
  ACCOUNT_DOSSIER_GLOSSARY[key as keyof typeof ACCOUNT_DOSSIER_GLOSSARY] as string | undefined;

export interface SurfaceCoverageSpec {
  allowlist: readonly string[];
  files: string[];
  shorthand?: ShorthandResolver;
}

export const SURFACE_MAP: Record<string, SurfaceCoverageSpec> = {
  'partner-history': {
    allowlist: Object.values(PARTNER_HISTORY_SURFACE_CONCEPTS),
    files: [
      'public/portal/partner-history/index.html',
      'public/portal/components/limit-changes-card.js',
    ],
    shorthand: partnerHistoryResolver,
  },
  partners: {
    allowlist: Object.values(PARTNERS_SURFACE_CONCEPTS),
    files: ['public/portal/partners/index.html'],
  },
  limits: {
    allowlist: Object.values(LIMIT_SURFACE_CONCEPTS),
    files: ['public/portal/limits/index.html', 'public/portal/limits/limit-profiles.js'],
  },
  account: {
    allowlist: Object.values(ACCOUNT_DOSSIER_SURFACE_CONCEPTS),
    files: ['public/portal/account/index.html', 'public/portal/account/account-dossier.js'],
    shorthand: accountResolver,
  },
};

export interface SurfaceCoverageResult {
  surface: string;
  orphans: string[]; // used on the page but missing from the allowlist
  unknown: string[]; // used but not in the canonical glossary
  unwired: string[]; // allowlisted but never referenced in chrome (warning)
  broken: string[]; // G.<key> shorthand that fails to resolve
}

/** Scan every surface; pure over the fs (root injectable for tests). */
export async function scanSurfaceCoverage(root = process.cwd()): Promise<SurfaceCoverageResult[]> {
  const registry = JSON.parse(
    await Bun.file(joinPath(root, 'public/registry/domain-glossary.json')).text()
  ) as { concepts?: { id: unknown }[] };
  const canonical = new Set((registry.concepts ?? []).map(c => String(c.id)));

  const results: SurfaceCoverageResult[] = [];
  for (const [surface, spec] of Object.entries(SURFACE_MAP)) {
    const allowed = new Set(spec.allowlist);
    const used = new Set<string>();
    const broken: string[] = [];
    for (const file of spec.files) {
      const text = await Bun.file(joinPath(root, file)).text();
      const { used: fileUsed } = collectUsedConcepts(text, spec.shorthand);
      for (const concept of fileUsed) used.add(concept);
    }
    results.push({
      surface,
      orphans: [...used].filter(c => !allowed.has(c)).sort(),
      unknown: [...used].filter(c => !canonical.has(c)).sort(),
      unwired: [...allowed].filter(c => !used.has(c)).sort(),
      broken,
    });
  }
  return results;
}

/** Flatten scan results into gate issues ([] = valid). */
export function validateSurfaceCoverage(results: SurfaceCoverageResult[]): string[] {
  const issues: string[] = [];
  for (const result of results) {
    for (const concept of result.orphans) {
      issues.push(
        `ORPHAN: "${concept}" used in ${result.surface} but not in the surface allowlist`
      );
    }
    for (const concept of result.unknown) {
      issues.push(
        `UNKNOWN: "${concept}" used in ${result.surface} but not in the canonical glossary`
      );
    }
    for (const key of result.broken) {
      issues.push(`BROKEN: G.${key} shorthand in ${result.surface} fails to resolve`);
    }
  }
  return issues;
}

/**
 * Extract the statically-resolvable concepts from page source. Literal markers
 * count as-is; simple `${G.key}` / `${MAP.key}` template forms resolve via the
 * page's glossary map; complex expressions (ternaries, variables) are
 * runtime-dynamic and skipped. Pure over a string — unit-testable.
 */
export function collectUsedConcepts(
  text: string,
  shorthand?: ShorthandResolver
): { used: Set<string>; dynamic: number } {
  const used = new Set<string>();
  let dynamic = 0;
  for (const match of text.matchAll(/data-glossary-concept="([^"]+)"/g)) {
    const raw = match[1]!;
    if (raw.startsWith('${')) {
      const templated = raw.match(/^\$\{(?:[A-Za-z_$]+\.)?([a-zA-Z0-9_]+)\}$/);
      const resolved = templated ? shorthand?.(templated[1]!) : undefined;
      if (resolved) used.add(resolved);
      else dynamic++;
    } else {
      used.add(raw);
    }
  }
  return { used, dynamic };
}

async function main(): Promise<void> {
  const results = await scanSurfaceCoverage();
  for (const result of results) {
    if (result.unwired.length > 0) {
      console.log(
        `  · ${result.surface}: ${result.unwired.length} allowlisted concept(s) never referenced in chrome (warning)`
      );
    }
  }
  const issues = validateSurfaceCoverage(results);
  if (issues.length === 0) {
    console.log('✅ Surface coverage: PASS');
    return;
  }
  console.error(`❌ Surface coverage: FAIL (${issues.length})`);
  for (const issue of issues) console.error(`  ✗ ${issue}`);
  process.exit(1);
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

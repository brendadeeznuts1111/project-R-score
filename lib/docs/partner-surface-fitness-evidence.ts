// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * partner-surface-fitness-evidence.ts — prove brand.hasTestCoverage against tests.
 *
 * Scans test sources for mintAuthority identifiers (parseX / asX). Warns when the
 * bag boolean drifts from observed evidence.
 *
 * @see docs/design/partner-surface-inventory.md
 */
import type { PartnerSurfaceBrandBag, PartnerSurfaceRow } from './partner-surface-inventory.ts';

export type FitnessEvidenceIssue = {
  readonly level: 'error' | 'warn';
  readonly message: string;
};

/** Runtime tests + type-level `*.test-d.ts` proofs (branded constructors). */
const TEST_GLOB = '{tests,packages}/**/*.{test,spec,test-d}.{ts,tsx,js,jsx}';

/** Extract searchable mint symbols from a mintAuthority label. */
export function mintAuthoritySearchTerms(mintAuthority: string): readonly string[] {
  const parts = mintAuthority
    .trim()
    .split(/[\s/,]+/)
    .map(p => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (/^(parse|as|try)[A-Z][A-Za-z0-9]*$/.test(p)) out.push(p);
  }
  // Fall back to last path segment when label is prose-only.
  if (out.length === 0 && parts.length > 0) {
    const last = parts[parts.length - 1]!;
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(last)) out.push(last);
  }
  return [...new Set(out)];
}

export async function loadTestCorpusText(root: string): Promise<string> {
  const glob = new Bun.Glob(TEST_GLOB);
  const chunks: string[] = [];
  for await (const rel of glob.scan({
    cwd: root,
    onlyFiles: true,
    followSymlinks: false,
  })) {
    const norm = rel.replace(/\\/g, '/');
    if (norm.includes('node_modules/') || norm.includes('.worktrees/')) continue;
    try {
      chunks.push(await Bun.file(`${root.replace(/\/$/, '')}/${norm}`).text());
    } catch {
      // skip unreadable
    }
  }
  return chunks.join('\n');
}

export function evidenceHasTestCoverage(mintAuthority: string, corpus: string): boolean {
  const terms = mintAuthoritySearchTerms(mintAuthority);
  if (terms.length === 0) return false;
  return terms.some(term => corpus.includes(term));
}

/**
 * Compare brand.hasTestCoverage declarations against mintAuthority hits in tests.
 * Missing bag field → no issue (optional). Drift → warn.
 */
export function checkBrandTestCoverageEvidence(
  rows: readonly PartnerSurfaceRow[],
  corpus: string
): readonly FitnessEvidenceIssue[] {
  const issues: FitnessEvidenceIssue[] = [];
  for (const r of rows) {
    if (r.aspect !== 'brand' || !r.brand) continue;
    const bag: PartnerSurfaceBrandBag = r.brand;
    if (bag.hasTestCoverage === undefined) continue;
    const evidenced = evidenceHasTestCoverage(bag.mintAuthority, corpus);
    if (bag.hasTestCoverage && !evidenced) {
      issues.push({
        level: 'warn',
        message:
          `${r.id}: hasTestCoverage=true but mintAuthority "${bag.mintAuthority}" ` +
          `not found under tests/ or packages/**/*.test.ts ` +
          `(terms: ${mintAuthoritySearchTerms(bag.mintAuthority).join(', ') || '—'})`,
      });
    } else if (!bag.hasTestCoverage && evidenced) {
      issues.push({
        level: 'warn',
        message:
          `${r.id}: hasTestCoverage=false but mintAuthority terms appear in tests — ` +
          `set hasTestCoverage=true or narrow mintAuthority`,
      });
    }
  }
  return issues;
}

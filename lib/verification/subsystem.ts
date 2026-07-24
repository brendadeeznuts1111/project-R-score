/**
 * Verification subsystem taxonomy — orthogonal to release channel.
 *
 * Maps Bun product pillars (runtime / package-manager / bundler) onto proof rows.
 * Aligns with docs catalog DocSection where possible; blog ship notes default to runtime.
 *
 * @see tools/bun-docs-catalog.ts — DocSection / sectionFromUrl
 * @see lib/docs/bun-site-url.ts — BunSiteKind (docs vs blog vs reference)
 */
import { sectionFromUrl, type DocSection } from '../../tools/bun-docs-catalog.ts';
import { parseBunSiteUrl, type BunSiteKind } from '../docs/bun-site-url.ts';
import type { VerificationResult, VerificationSubsystem } from './types.ts';

export type { VerificationSubsystem };

export const VERIFICATION_SUBSYSTEMS = [
  'runtime',
  'package-manager',
  'networking',
  'bundler',
  'test',
  'other',
] as const satisfies readonly VerificationSubsystem[];

/** Map docs catalog section → verification subsystem. */
export function subsystemFromDocSection(section: DocSection): VerificationSubsystem {
  switch (section) {
    case 'runtime':
      return 'runtime';
    case 'pm':
      return 'package-manager';
    case 'bundler':
      return 'bundler';
    case 'test':
      return 'test';
    case 'guides':
    case 'reference':
    case 'other':
    default:
      return 'other';
  }
}

/** Infer subsystem from a canonical docs/blog/reference URL. */
export function subsystemFromCanonicalUrl(url?: string): VerificationSubsystem {
  if (!url) return 'other';
  const parsed = parseBunSiteUrl(url);
  if (parsed?.kind === 'blog') {
    const hay = `${parsed.path}#${parsed.hash}`.toLowerCase();
    // Versioned ship-note anchors → pillar by topic (blog default is runtime).
    if (/global-virtual-store|bun-publish|npmrc|package.?manager|install|no-orphans/.test(hay)) {
      return 'package-manager';
    }
    if (/bundler|bytecode|feature-flags|await-using|minify|css-modules|loaders?/.test(hay)) {
      return 'bundler';
    }
    return 'runtime';
  }
  if (parsed?.kind === 'reference') return 'runtime';
  const section = sectionFromUrl(url);
  if (section === 'runtime') {
    const hay = url.toLowerCase();
    if (
      /\/networking\/(fetch|dns|tcp|udp)|dns-prefetch|preconnect|keep-alive|simultaneous-connection/.test(
        hay
      )
    ) {
      return 'networking';
    }
  }
  return subsystemFromDocSection(section);
}

/** Heuristic when the probe name encodes the pillar (install platform, bundler:…). */
export function subsystemFromProbeName(name: string): VerificationSubsystem | undefined {
  const n = name.toLowerCase();
  if (
    n.startsWith('install platform:') ||
    n.startsWith('install-env:') ||
    n.startsWith('bun_config_')
  ) {
    return 'package-manager';
  }
  if (n.startsWith('networking:') || n.includes('dns.') || n.includes('preconnect')) {
    return 'networking';
  }
  if (n.startsWith('bundler:') || n.startsWith('loader:')) return 'bundler';
  if (n.startsWith('runtime-nits:')) return 'runtime';
  return undefined;
}

/** Docs cadence / reliability: living docs vs versioned blog ship notes. */
export function canonicalSourceFromUrl(url?: string): BunSiteKind | 'other' {
  if (!url) return 'other';
  return parseBunSiteUrl(url)?.kind ?? 'other';
}

/**
 * Tag a result with subsystem + canonicalSource (idempotent; preserves explicit values).
 */
export function withSubsystem<T extends VerificationResult>(
  row: T,
  explicit?: VerificationSubsystem
): T {
  const subsystem =
    explicit ??
    row.subsystem ??
    subsystemFromProbeName(row.name) ??
    subsystemFromCanonicalUrl(row.canonical);
  const canonicalSource = row.canonicalSource ?? canonicalSourceFromUrl(row.canonical);
  return { ...row, subsystem, canonicalSource };
}

/** Aggregate pass counts by subsystem for report summaries. */
export function summarizeBySubsystem(
  results: VerificationResult[]
): Partial<Record<VerificationSubsystem, { passed: number; total: number }>> {
  const out: Partial<Record<VerificationSubsystem, { passed: number; total: number }>> = {};
  for (const r of results) {
    const key = r.subsystem ?? subsystemFromCanonicalUrl(r.canonical);
    const bucket = out[key] ?? { passed: 0, total: 0 };
    bucket.total++;
    if (r.passed) bucket.passed++;
    out[key] = bucket;
  }
  return out;
}

/**
 * Distinct subsystems present in results — for semanticTags.subsystems.
 * Stable order matches VERIFICATION_SUBSYSTEMS.
 */
export function subsystemsFromResults(
  results: readonly Pick<VerificationResult, 'subsystem' | 'canonical'>[]
): VerificationSubsystem[] {
  const present = new Set<VerificationSubsystem>();
  for (const r of results) {
    present.add(r.subsystem ?? subsystemFromCanonicalUrl(r.canonical));
  }
  return VERIFICATION_SUBSYSTEMS.filter(s => present.has(s));
}

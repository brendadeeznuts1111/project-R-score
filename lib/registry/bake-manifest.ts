// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Registry bake manifest — timestamps + paths for operator boards.
 *
 * Does not hash file contents by default (cheap scan). Optional etag via
 * Bun.CryptoHasher when callers pass `includeEtag: true`.
 */
import { joinPath } from '../path-bun.ts';

export const BAKE_MANIFEST_KIND = 'registry-bake-manifest' as const;
export const BAKE_MANIFEST_PATH = '/registry/bake-manifest.json' as const;
/** Schema 2: additive `runtime` provenance block (Bun version that wrote the inventory). */
export const BAKE_MANIFEST_SCHEMA_VERSION = 2 as const;

export type BakeManifestEntry = {
  path: string; // brand-ok — registry-relative path
  bakedAt: string | null;
  source: string | null;
  bytes: number;
  etag: string | null;
};

/**
 * Which runtime generated this inventory — absolute proof on production boards.
 * Prefer `Bun.version`; allow `BUN_VERSION` env override (CI / pin labels).
 */
export type BakeManifestRuntime = {
  runtime: 'bun';
  runtimeVersion: string;
  /** Wall-clock when this inventory was written (ISO-8601). */
  bakedAt: string;
  /** Optional short git revision of the Bun binary when available. */
  runtimeRevision?: string;
};

export type BakeManifest = {
  kind: typeof BAKE_MANIFEST_KIND;
  schemaVersion: typeof BAKE_MANIFEST_SCHEMA_VERSION;
  generatedAt: string;
  root: string;
  /** Bun runtime that produced this manifest. */
  runtime: BakeManifestRuntime;
  entries: BakeManifestEntry[];
  summary: {
    files: number;
    withTimestamp: number;
    totalBytes: number;
  };
};

/**
 * Resolve Bun version for bake provenance.
 * Order: explicit override → `BUN_VERSION` env → `Bun.version` → `unknown`.
 */
export function resolveBakeRuntime(opts?: {
  bakedAt?: string;
  runtimeVersion?: string;
  runtimeRevision?: string;
}): BakeManifestRuntime {
  const fromEnv = typeof Bun !== 'undefined' ? Bun.env.BUN_VERSION?.trim() : undefined;
  const fromBun = typeof Bun !== 'undefined' && Bun.version ? String(Bun.version) : '';
  const runtimeVersion =
    (opts?.runtimeVersion && opts.runtimeVersion.trim()) ||
    (fromEnv && fromEnv.length > 0 ? fromEnv : '') ||
    fromBun ||
    'unknown';
  const revision =
    (opts?.runtimeRevision && opts.runtimeRevision.trim()) ||
    (typeof Bun !== 'undefined' && Bun.revision ? String(Bun.revision).slice(0, 12) : '');
  const bakedAt = opts?.bakedAt ?? new Date().toISOString();
  const out: BakeManifestRuntime = {
    runtime: 'bun',
    runtimeVersion,
    bakedAt,
  };
  if (revision) out.runtimeRevision = revision;
  return out;
}

/** Known high-signal registry artifacts for the partner / tennis desk. */
export const BAKE_MANIFEST_PRIORITY_PATHS = [
  'ops-summary.json',
  'partners-ops.json',
  'telegram-handshake.json',
  'limit-raises.json',
  'projects-registry.json',
  'tennis/partner-contracts.json',
  'tennis/agent-auth.json',
  'tennis/board-metrics.json',
  'portal-chrome.json',
  'domain-glossary.json',
  'github-issue-taxonomy.json',
  'concepts-graph.json',
] as const;

function pickTimestamp(obj: Record<string, unknown>): string | null {
  for (const key of [
    'generatedAt',
    'generated_at',
    'generated',
    'bakedAt',
    'baked_at',
    'updatedAt',
  ]) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const meta = obj.meta;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    for (const key of ['generatedAt', 'generated_at', 'bakedAt']) {
      const v = m[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

function pickSource(obj: Record<string, unknown>): string | null {
  const s = obj.source;
  if (typeof s === 'string' && s.trim()) return s.trim();
  return null;
}

export async function buildBakeManifest(opts: {
  registryDir: string;
  generatedAt?: string;
  /** Extra relative paths under registryDir. */
  paths?: readonly string[];
  includeEtag?: boolean;
  /** Override runtime provenance (tests). */
  runtime?: BakeManifestRuntime;
}): Promise<BakeManifest> {
  const generatedAt = opts.generatedAt ?? new Date().toISOString();
  const runtime =
    opts.runtime ??
    resolveBakeRuntime({
      bakedAt: generatedAt,
    });
  const paths = [...new Set([...(opts.paths ?? []), ...BAKE_MANIFEST_PRIORITY_PATHS])].sort();
  const entries: BakeManifestEntry[] = [];

  for (const rel of paths) {
    const abs = joinPath(opts.registryDir, rel);
    const file = Bun.file(abs);
    if (!(await file.exists())) continue;
    const bytes = file.size;
    let bakedAt: string | null = null;
    let source: string | null = null;
    let etag: string | null = null;
    try {
      const text = await file.text();
      if (opts.includeEtag) {
        etag = Bun.CryptoHasher.hash('sha256', text, 'hex').slice(0, 16);
      }
      const json = JSON.parse(text) as unknown;
      if (json && typeof json === 'object' && !Array.isArray(json)) {
        const rec = json as Record<string, unknown>;
        bakedAt = pickTimestamp(rec);
        source = pickSource(rec);
      }
    } catch {
      /* non-json or unreadable — still list bytes */
    }
    entries.push({
      path: `/registry/${rel}`,
      bakedAt,
      source,
      bytes,
      etag,
    });
  }

  return {
    kind: BAKE_MANIFEST_KIND,
    schemaVersion: BAKE_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    root: opts.registryDir,
    runtime,
    entries,
    summary: {
      files: entries.length,
      withTimestamp: entries.filter(e => e.bakedAt != null).length,
      totalBytes: entries.reduce((s, e) => s + e.bytes, 0),
    },
  };
}

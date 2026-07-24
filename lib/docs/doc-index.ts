// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve port
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/docs/runtime/utils#bun-readablestreamto — Bun.readableStreamTo
/**
 * Canonical documentation index — built from CANONICAL_REFS + bun-docs-catalog.json.
 *
 * @see ../../tools/bun-doc-refs.ts — CANONICAL_REFS SSOT
 * @see ../../tools/bun-docs-catalog.ts — kind / stability / examples
 * @see https://bun.com/docs/llms.txt — agent docs index
 */
import { sha256Hex } from '../bun-utils-proof.ts';
import { CANONICAL_REFS, listCodeApiKeys, resolveApiAlias } from '../../tools/bun-doc-refs.ts';
import {
  loadCatalog,
  loadCatalogFile,
  type DocCatalogEntry,
} from '../../tools/bun-docs-catalog.ts';
import { toBunTokenKind } from './bun-token.ts';

export const DOC_INDEX_PATH = 'public/registry/doc-index.json';

export type DocIndexEntry = {
  key: string;
  url: string;
  kind: string;
  stability: string;
  since: string;
  description: string;
  examples: string[];
  related: string[];
  meta: {
    catalogHit: boolean;
    section?: string;
    verifiedOn?: string;
  };
};

export type DefaultsDocCoverageRow = {
  name: string;
  docKey: string;
  documented: boolean;
  url: string | null;
  stability: string | null;
};

/** verify-defaults.ts test name → CANONICAL_REFS key */
export const DEFAULTS_VERIFY_DOC_KEYS: Record<string, string> = {
  'CryptoHasher requires algorithm': 'Bun.CryptoHasher',
  'password.hash default argon2id': 'Bun.password',
  'inspect default depth shows all': 'Bun.inspect',
  'write creates dirs': 'Bun.write',
  'file.stat works': 'Bun.file',
  'serve port fallback': 'Bun.serve port',
  'which returns null for missing': 'Bun.which',
  'escapeHTML escapes & < > " \'': 'Bun.escapeHTML',
  'readableStreamToBytes empty': 'Bun.readableStreamTo',
  'nanoseconds monotonic': 'Bun.nanoseconds',
  'sleep ~50ms': 'Bun.sleep',
  'hash returns bigint': 'Bun.hash',
};

export type DocIndexProof = {
  schemaVersion: 1;
  timestamp: string;
  bunVersion: string;
  bunRevision: string;
  catalogGenerated: string | null;
  catalogBunVersion: string | null;
  totalEntries: number;
  byStability: Record<string, number>;
  byKind: Record<string, number>;
  entries: DocIndexEntry[];
  defaultsCoverage: {
    passed: boolean;
    total: number;
    documented: number;
    rows: DefaultsDocCoverageRow[];
  };
  proofHash: string;
};

function findCatalogEntry(catalog: DocCatalogEntry[], key: string): DocCatalogEntry | undefined {
  const direct = catalog.find(e => e.name === key);
  if (direct) return direct;
  const alias = resolveApiAlias(key);
  if (alias !== key) {
    const hit = catalog.find(e => e.name === alias);
    if (hit) return hit;
  }
  return catalog.find(e => e.name.toLowerCase() === key.toLowerCase());
}

function catalogTypeLabel(type: string): string {
  return toBunTokenKind(type);
}

function entryFromRef(key: string, url: string, catalog?: DocCatalogEntry): DocIndexEntry {
  const examples =
    catalog?.examples?.map(ex => (typeof ex === 'string' ? ex : ex.body)).filter(Boolean) ?? [];
  return {
    key,
    url,
    kind: catalog ? catalogTypeLabel(catalog.type) : 'Other',
    stability: catalog?.stability ?? 'stable',
    since: catalog?.releasedIn ?? 'unknown',
    description: catalog?.description ?? '',
    examples,
    related: catalog?.related ?? [],
    meta: {
      catalogHit: Boolean(catalog),
      section: catalog?.section,
      verifiedOn: catalog?.verifiedOn,
    },
  };
}

export function buildDefaultsDocCoverage(
  entries: readonly DocIndexEntry[]
): DocIndexProof['defaultsCoverage'] {
  const byKey = new Map(entries.map(e => [e.key, e]));
  const rows: DefaultsDocCoverageRow[] = Object.entries(DEFAULTS_VERIFY_DOC_KEYS).map(
    ([name, docKey]) => {
      const refUrl = CANONICAL_REFS[docKey] ?? CANONICAL_REFS[resolveApiAlias(docKey)];
      const entry = byKey.get(docKey);
      return {
        name,
        docKey,
        documented: Boolean(refUrl),
        url: refUrl ?? entry?.url ?? null,
        stability: entry?.stability ?? null,
      };
    }
  );
  const documented = rows.filter(r => r.documented).length;
  return {
    passed: rows.every(r => r.documented),
    total: rows.length,
    documented,
    rows,
  };
}

export async function buildDocIndex(opts: { now?: () => Date } = {}): Promise<DocIndexProof> {
  const now = opts.now ?? (() => new Date());
  const catalog = await loadCatalog();
  const catalogMeta = await loadCatalogFile().catch(() => null);

  const keys = [...listCodeApiKeys()].sort();
  const entries: DocIndexEntry[] = keys.map(key => {
    const url = CANONICAL_REFS[key] ?? CANONICAL_REFS[resolveApiAlias(key)];
    if (!url) {
      throw new Error(`CANONICAL_REFS missing URL for ${key}`);
    }
    return entryFromRef(key, url, findCatalogEntry(catalog, key));
  });

  const byStability: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  for (const e of entries) {
    byStability[e.stability] = (byStability[e.stability] ?? 0) + 1;
    byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
  }

  const defaultsCoverage = buildDefaultsDocCoverage(entries);
  const body = {
    schemaVersion: 1 as const,
    timestamp: now().toISOString(),
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
    catalogGenerated: catalogMeta?.generated ?? null,
    catalogBunVersion: catalogMeta?.bunVersion ?? null,
    totalEntries: entries.length,
    byStability,
    byKind,
    entries,
    defaultsCoverage,
  };

  const proofHash = sha256Hex(
    JSON.stringify({
      ...body,
      entries: entries.map(e => ({ key: e.key, url: e.url, stability: e.stability })),
    })
  );

  return { ...body, proofHash };
}

export async function readDocIndexCompact(): Promise<{
  available: boolean;
  totalEntries?: number;
  stable?: number;
  experimental?: number;
  deprecated?: number;
  defaultsCoverage?: boolean;
  proofHash?: string;
  generated?: string;
}> {
  const file = Bun.file(DOC_INDEX_PATH);
  if (!(await file.exists())) return { available: false };
  try {
    const parsed = (await file.json()) as DocIndexProof;
    return {
      available: true,
      totalEntries: parsed.totalEntries,
      stable: parsed.byStability?.stable ?? 0,
      experimental: parsed.byStability?.experimental ?? 0,
      deprecated: parsed.byStability?.deprecated ?? 0,
      defaultsCoverage: parsed.defaultsCoverage?.passed,
      proofHash: parsed.proofHash,
      generated: parsed.timestamp,
    };
  } catch {
    return { available: false };
  }
}

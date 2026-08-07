// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver (portal doctor minBun checks)
// @see https://bun.com/docs/runtime/hashing — Bun.CryptoHasher (subset fingerprint)
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals (stable bake compare)
/**
 * Capability map subset — parse grounded capability table → portal tools-hub JSON.
 *
 * Full matrix SSOT: docs/harness/capability-map.md#grounded-capability-map
 * Compact bake: public/registry/capability-map-subset.json
 * Full bake (debug / portal docs): public/registry/capability-map-full.json
 *
 * Required display fields retain the `"—"` sentinel for compatibility.
 * Optional v4 fields use null so JSON consumers do not need to parse display text.
 *
 *   bun run bake:capabilities
 *   bun run bake:capabilities:check
 *   bun test tests/capability-map-subset.test.ts --update-snapshots
 */

export const CAPABILITY_MAP_SUBSET_KIND = 'capability-map-subset' as const;
export const CAPABILITY_MAP_FULL_KIND = 'capability-map-full' as const;
/** v4: additive structured range, nullable raw APIs, example, source anchor, and category. */
export const CAPABILITY_MAP_SUBSET_SCHEMA = 4 as const;
export const CAPABILITY_MAP_FULL_SCHEMA = 2 as const;
export const CAPABILITY_MAP_SUBSET_REL = 'public/registry/capability-map-subset.json';
export const CAPABILITY_MAP_FULL_REL = 'public/registry/capability-map-full.json';
export const CAPABILITY_MAP_SOURCE = 'docs/harness/capability-map.md#grounded-capability-map';
/** Markdown file parsed by bake:capabilities (repo-relative). */
export const CAPABILITY_MAP_MARKDOWN_REL = 'docs/harness/capability-map.md';

/** Stable sentinel used by required display fields and legacy consumers. */
export const CAPABILITY_EMPTY_CELL = '—' as const;

/** Runtime surface: Bun APIs vs Proton Pass CLI vs both. */
export type CapabilityProtocol = 'Bun' | 'pass-cli' | 'Bun + pass-cli' | '—';

export type CapabilityVersionRange = {
  bun: { min: string | null; max: string | null } | null;
  passCli: { min: string | null; max: string | null } | null;
};

/**
 * Compact tools-hub row (v4).
 * The display-oriented `api` and `version` fields remain stable for existing
 * portal consumers. Structured and nullable fields are additive in v4.
 */
export type CapabilityMapRow = {
  /** Stable slug derived from `capability` — anchors, cross-refs, drift diffs. */
  id: string; // brand-ok — capability row slug (not domain *Id)
  capability: string;
  /** Primary display signature; Bun wins when both protocol cells are populated. */
  api: string;
  status: string;
  usedIn: string;
  /** Domain class from AGENTS table (config · secrets · runtime · pkg · …). Empty → null. */
  type: string | null;
  /** Source table display constraint retained for portal compatibility. */
  version: string;
  /** Structured version constraint for machine consumers. */
  versionRange: CapabilityVersionRange | null;
  /** Which protocol family the API belongs to. */
  protocol: CapabilityProtocol;
  /** Raw Bun API cell (may be null). */
  bunApi: string | null;
  /** Raw Proton CLI cell (may be null). */
  protonCli: string | null;
  /** Minimum Bun version when extractable from `version` (e.g. `"1.4.0"`). */
  minBun?: string;
  /** Minimum pass-cli version when extractable (e.g. `"2.2.0"`). */
  minPassCli?: string;
  /** Canonical Bun/Proton doc URL when Source column has an http(s) link. */
  source?: string;
  /** Valid AGENTS.md section anchor containing the source row. */
  sourceAnchor: string;
  /** Example code snippet from AGENTS.md. Null when absent. */
  example: string | null;
  /** Functional category for grouping (e.g. "Secrets", "Runtime", "Config"). Derived from type. */
  category: string | null;
};

export type CapabilityMapSummary = {
  protocolCounts: Record<string, number>;
  typeCounts: Record<string, number>;
};

export type CapabilityMapSubset = {
  kind: typeof CAPABILITY_MAP_SUBSET_KIND;
  schemaVersion: typeof CAPABILITY_MAP_SUBSET_SCHEMA;
  source: string;
  note: string;
  generatedAt: string;
  rowCount: number;
  /** sha256 of the payload minus generatedAt/fingerprint — stale-bake detection. */
  fingerprint: string;
  summary: CapabilityMapSummary;
  rows: CapabilityMapRow[];
};

/** Full matrix row — v4 subset fields plus the markdown source label. */
export type CapabilityMapFullRow = CapabilityMapRow & {
  /** Source link label (e.g. "Bun TOML loader") when markdown link present. */
  sourceLabel?: string;
};

export type CapabilityMapFull = {
  kind: typeof CAPABILITY_MAP_FULL_KIND;
  schemaVersion: typeof CAPABILITY_MAP_FULL_SCHEMA;
  source: string;
  note: string;
  generatedAt: string;
  rowCount: number;
  summary: CapabilityMapSummary;
  rows: CapabilityMapFullRow[];
};

/** Strip markdown bold / links / trailing whitespace. */
export function stripMdCell(raw: string): string {
  let s = raw.trim();
  // **bold**
  s = s.replace(/^\*\*(.+)\*\*$/, '$1');
  // [text](url) → text
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // backticks keep inner
  s = s.replace(/`([^`]+)`/g, '$1');
  return s.trim();
}

/**
 * Extract first markdown link URL or bare http(s) URL from a cell.
 * Returns undefined for "same", custom paths, or empty cells.
 */
export function extractMdLinkUrl(raw: string | null | undefined): string | undefined {
  if (!raw || isDash(raw)) return undefined;
  const s = raw.trim();
  const md = s.match(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/i);
  if (md?.[2]) return md[2];
  const bare = s.match(/^(https?:\/\/\S+)$/i);
  if (bare?.[1]) return bare[1];
  return undefined;
}

/** Extract first markdown link label text (before URL strip). */
export function extractMdLinkLabel(raw: string): string | undefined {
  const s = raw.trim();
  if (!s || isDash(s)) return undefined;
  const md = s.match(/\[([^\]]+)\]\([^)]+\)/);
  if (md?.[1]) return stripMdCell(md[1]);
  return undefined;
}

function isDash(s: string | null | undefined): boolean {
  if (s == null) return true;
  const t = s.trim();
  return !t || t === '—' || t === '-' || t === '–' || t === '—';
}

/**
 * Normalize a dotted version to at least major.minor.patch for Bun.semver.
 * "1.4" → "1.4.0", "1" → "1.0.0", "1.4.0" stays.
 */
export function normalizeSemver(v: string): string {
  const parts = v.split('.').filter(Boolean);
  while (parts.length < 3) parts.push('0');
  return parts.slice(0, 3).join('.');
}

/**
 * Parse AGENTS version cell into optional minBun / minPassCli.
 * Handles "Bun ≥1.4", "pass‑cli ≥2.2", combined "Bun ≥1.0 · pass-cli ≥2.2",
 * unicode ≥ / ≥ and non-breaking hyphens in pass‑cli.
 */
export function parseVersionConstraints(versionCell: string): {
  minBun?: string;
  minPassCli?: string;
} {
  const raw = versionCell.trim();
  if (!raw || isDash(raw)) return {};
  // Normalize unicode comparison and hyphen variants
  const s = raw
    .replace(/\u2265/g, '≥') // ≥
    .replace(/>=/g, '≥')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-'); // various dashes → -

  const out: { minBun?: string; minPassCli?: string } = {};

  const bunMatch = s.match(/\bBun\b[^0-9]*?(\d+(?:\.\d+){0,2})/i);
  if (bunMatch?.[1]) {
    out.minBun = normalizeSemver(bunMatch[1]);
  }

  const passMatch = s.match(/\bpass[\s-]*cli\b[^0-9]*?(\d+(?:\.\d+){0,2})/i);
  if (passMatch?.[1]) {
    out.minPassCli = normalizeSemver(passMatch[1]);
  }

  return out;
}

/** Prefer Bun API when present; else Proton CLI; never invent values. */
export function pickApiCell(
  bunApi: string | null | undefined,
  protonCli: string | null | undefined
): string {
  const bun = stripMdCell(bunApi ?? CAPABILITY_EMPTY_CELL);
  const proton = stripMdCell(protonCli ?? CAPABILITY_EMPTY_CELL)
    .replace(/\s*\(not\s+[^)]+\)/gi, '')
    .trim();
  if (!isDash(bun)) return bun;
  if (!isDash(proton)) return proton;
  return CAPABILITY_EMPTY_CELL;
}

/** Enforce the compatibility `api` derivation at the bake boundary. */
export function assertApiIntegrity(row: CapabilityMapRow): void {
  const expected = pickApiCell(row.bunApi, row.protonCli);
  if (row.api !== expected) {
    throw new Error(
      `capability api integrity failed for "${row.capability}": api=${JSON.stringify(row.api)} expected=${JSON.stringify(expected)}`
    );
  }
}

/**
 * Protocol column: which stack the row is grounded on.
 */
export function pickProtocol(bunApi: string, protonCli: string): CapabilityProtocol {
  const bun = stripMdCell(bunApi);
  let proton = stripMdCell(protonCli);
  proton = proton.replace(/\s*\(not\s+[^)]+\)/gi, '').trim();
  const hasBun = !isDash(bun);
  const hasProton = !isDash(proton);
  if (hasBun && hasProton) return 'Bun + pass-cli';
  if (hasBun) return 'Bun';
  if (hasProton) return 'pass-cli';
  return CAPABILITY_EMPTY_CELL;
}

const CATEGORY_BY_TYPE: Readonly<Record<string, string>> = {
  audit: 'Governance',
  cli: 'Package',
  compress: 'Runtime',
  config: 'Configuration',
  debug: 'Runtime',
  deps: 'Package',
  dev: 'Developer',
  display: 'Runtime',
  env: 'Configuration',
  image: 'Runtime',
  infra: 'Governance',
  integrity: 'Package',
  io: 'Runtime',
  network: 'Runtime',
  output: 'Runtime',
  perf: 'Runtime',
  pkg: 'Package',
  routing: 'Runtime',
  runtime: 'Runtime',
  secrets: 'Secrets',
  security: 'Governance',
  ssh: 'Secrets',
  test: 'Developer',
  ui: 'Developer',
};

function capabilityCategory(type: string): string | null {
  if (!type || isDash(type)) return null;
  return CATEGORY_BY_TYPE[type.toLowerCase()] ?? 'Other';
}

export function buildCapabilitySummary(rows: CapabilityMapRow[]): CapabilityMapSummary {
  const protocolCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  for (const r of rows) {
    const p = r.protocol || CAPABILITY_EMPTY_CELL;
    const t = r.type || CAPABILITY_EMPTY_CELL;
    protocolCounts[p] = (protocolCounts[p] ?? 0) + 1;
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  return { protocolCounts, typeCounts };
}

type ParsedTableRow = {
  subset: CapabilityMapRow;
  full: CapabilityMapFullRow;
};

/**
 * Parse grounded capability map markdown table into subset + full rows.
 * Expects header containing "Capability" and "Status".
 */
export function parseCapabilityTableDetailed(md: string): ParsedTableRow[] {
  const lines = md.split(/\r?\n/);
  let headerIdx = -1;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.includes('|')) continue;
    if (/Capability/i.test(line) && /Status/i.test(line) && /Used in/i.test(line)) {
      headers = line
        .split('|')
        .map(c => stripMdCell(c))
        .filter(Boolean);
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    throw new Error(
      'Grounded capability map table not found (need Capability + Status + Used in columns)'
    );
  }

  // skip separator |---|---|
  let i = headerIdx + 1;
  if (i < lines.length && /^\|?\s*:?-/.test(lines[i]!)) i++;

  const col = (name: string): number => {
    const n = name.toLowerCase();
    return headers.findIndex(h => h.toLowerCase() === n || h.toLowerCase().includes(n));
  };
  const iCap = col('capability');
  const iType = col('type');
  const iVer = col('version');
  const iBun = col('bun api');
  const iProton = col('proton');
  const iUsed = col('used in');
  const iStatus = col('status');
  const iSource = col('source');
  const iExample = col('example');
  if (iCap < 0 || iStatus < 0 || iUsed < 0) {
    throw new Error(`Capability table missing columns: got [${headers.join(', ')}]`);
  }

  const out: ParsedTableRow[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.includes('|')) break;
    if (/^##\s/.test(line.trim())) break;
    // split leaves empty ends from leading/trailing |
    const parts = line.split('|').map(c => c.trim());
    // drop first/last empty from |...|
    if (parts[0] === '') parts.shift();
    if (parts.length && parts[parts.length - 1] === '') parts.pop();
    if (parts.length < 3) continue;
    // skip pure separator
    if (parts.every(c => /^:?-+:?$/.test(c))) continue;

    const capability = stripMdCell(parts[iCap] ?? '');
    if (!capability || capability === '---') continue;
    const bunApiRaw = iBun >= 0 ? (parts[iBun] ?? CAPABILITY_EMPTY_CELL) : CAPABILITY_EMPTY_CELL;
    const protonRaw =
      iProton >= 0 ? (parts[iProton] ?? CAPABILITY_EMPTY_CELL) : CAPABILITY_EMPTY_CELL;
    const bunApi = stripMdCell(bunApiRaw);
    let protonCli = stripMdCell(protonRaw);
    protonCli = protonCli.replace(/\s*\(not\s+[^)]+\)/gi, '').trim() || CAPABILITY_EMPTY_CELL;
    const status = stripMdCell(parts[iStatus] ?? CAPABILITY_EMPTY_CELL);
    const usedIn = stripMdCell(parts[iUsed] ?? CAPABILITY_EMPTY_CELL);
    const type = iType >= 0 ? stripMdCell(parts[iType] ?? '') : '';
    const version = iVer >= 0 ? stripMdCell(parts[iVer] ?? '') : '';
    const sourceRaw = iSource >= 0 ? (parts[iSource] ?? '') : '';
    const sourceUrl = extractMdLinkUrl(sourceRaw);
    const sourceLabel = extractMdLinkLabel(sourceRaw);
    const exampleRaw = iExample >= 0 ? (parts[iExample] ?? '') : '';
    const example = isDash(exampleRaw) ? null : stripMdCell(exampleRaw);
    const { minBun, minPassCli } = parseVersionConstraints(version);

    const versionRange: CapabilityVersionRange | null =
      minBun || minPassCli
        ? {
            bun: minBun ? { min: minBun, max: null } : null,
            passCli: minPassCli ? { min: minPassCli, max: null } : null,
          }
        : null;

    const capSlug = slugifyCapability(capability);

    const subset: CapabilityMapRow = {
      id: capSlug,
      capability,
      api: pickApiCell(bunApiRaw, protonRaw),
      status,
      usedIn,
      type: type || null,
      version: version || CAPABILITY_EMPTY_CELL,
      versionRange,
      protocol: pickProtocol(bunApiRaw, protonRaw),
      bunApi: isDash(bunApi) ? null : bunApi,
      protonCli: isDash(protonCli) ? null : protonCli,
      example: example ?? null,
      sourceAnchor: '#grounded-capability-map',
      category: capabilityCategory(type),
    };
    if (minBun) subset.minBun = minBun;
    if (minPassCli) subset.minPassCli = minPassCli;
    if (sourceUrl) subset.source = sourceUrl;
    assertApiIntegrity(subset);

    const full: CapabilityMapFullRow = {
      ...subset,
      example,
    };
    if (sourceLabel) full.sourceLabel = sourceLabel;

    out.push({ subset, full });
  }

  if (out.length === 0) {
    throw new Error('Capability map table parsed zero data rows');
  }
  return out;
}

/**
 * Parse grounded capability map markdown table into subset rows.
 */
export function parseCapabilityTableFromMarkdown(md: string): CapabilityMapRow[] {
  return parseCapabilityTableDetailed(md).map(r => r.subset);
}

/** Slug for row ids: lowercase, non-alnum → `-`, collapsed, trimmed. */
export function slugifyCapability(capability: string): string {
  return capability
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** sha256 hex of the subset payload minus generatedAt/fingerprint (stable across rebakes). */
export function computeSubsetFingerprint(
  payload: Omit<CapabilityMapSubset, 'fingerprint'>
): string {
  const { generatedAt: _g, ...rest } = payload;
  return new Bun.CryptoHasher('sha256').update(JSON.stringify(rest)).digest('hex');
}

export function buildCapabilityMapSubset(
  md: string,
  generatedAt = new Date().toISOString()
): CapabilityMapSubset {
  const rows = parseCapabilityTableFromMarkdown(md);
  for (const row of rows) assertApiIntegrity(row);
  const base = {
    kind: CAPABILITY_MAP_SUBSET_KIND,
    schemaVersion: CAPABILITY_MAP_SUBSET_SCHEMA,
    source: CAPABILITY_MAP_SOURCE,
    note: 'Compact portal tools-hub rows (v4: compatible api/version display fields + nullable bunApi/protonCli · protocol-scoped versionRange · minBun/minPassCli · category · example · sourceAnchor). Full matrix: docs/harness/capability-map.md or capability-map-full.json. Generated by bake:capabilities. No secret values.',
    generatedAt,
    rowCount: rows.length,
    summary: buildCapabilitySummary(rows),
    rows,
  } as const;
  return { ...base, fingerprint: computeSubsetFingerprint(base) };
}

export function buildCapabilityMapFull(
  md: string,
  generatedAt = new Date().toISOString()
): CapabilityMapFull {
  const detailed = parseCapabilityTableDetailed(md);
  const rows = detailed.map(r => r.full);
  for (const row of rows) assertApiIntegrity(row);
  return {
    kind: CAPABILITY_MAP_FULL_KIND,
    schemaVersion: CAPABILITY_MAP_FULL_SCHEMA,
    source: CAPABILITY_MAP_SOURCE,
    note: 'Full grounded capability matrix (v2: additive v4 subset columns + sourceLabel). Generated by bake:capabilities. No secret values.',
    generatedAt,
    rowCount: rows.length,
    summary: buildCapabilitySummary(rows),
    rows,
  };
}

export function serializeCapabilityMapSubset(payload: CapabilityMapSubset): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function serializeCapabilityMapFull(payload: CapabilityMapFull): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/** Stable compare ignoring generatedAt (string form — hash / logs). */
export function capabilityMapSubsetFingerprint(payload: CapabilityMapSubset): string {
  const { generatedAt: _g, ...rest } = payload;
  return JSON.stringify(rest);
}

export function capabilityMapFullFingerprint(payload: CapabilityMapFull): string {
  const { generatedAt: _g, ...rest } = payload;
  return JSON.stringify(rest);
}

/**
 * Stable snapshot payload for drift gates (no generatedAt).
 * Prefer this over raw JSON so timestamps never thrash snapshots.
 */
export function capabilityMapSubsetForSnapshot(
  payload: CapabilityMapSubset
): Omit<CapabilityMapSubset, 'generatedAt'> {
  const { generatedAt: _g, ...rest } = payload;
  return rest;
}

/** Drop volatile fields before structural equality. */
export function stableCapabilityMapSubset(
  payload: CapabilityMapSubset
): Omit<CapabilityMapSubset, 'generatedAt' | 'fingerprint'> {
  const { generatedAt: _g, fingerprint: _f, ...rest } = payload;
  return rest;
}

export function stableCapabilityMapFull(
  payload: CapabilityMapFull
): Omit<CapabilityMapFull, 'generatedAt'> {
  const { generatedAt: _g, ...rest } = payload;
  return rest;
}

/**
 * Structural equality for bake --check (strict: undefined keys matter).
 * Prefer this over fingerprint string compare — Bun.deepEquals is the SSOT.
 * @see https://bun.com/docs/runtime/utils#bun-deepequals
 */
export function capabilityMapsDeepEqual(a: CapabilityMapSubset, b: CapabilityMapSubset): boolean {
  return Bun.deepEquals(stableCapabilityMapSubset(a), stableCapabilityMapSubset(b), true);
}

export function capabilityFullMapsDeepEqual(a: CapabilityMapFull, b: CapabilityMapFull): boolean {
  return Bun.deepEquals(stableCapabilityMapFull(a), stableCapabilityMapFull(b), true);
}

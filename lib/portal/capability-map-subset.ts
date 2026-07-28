// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Capability map subset — parse AGENTS.md grounded capability table → portal tools-hub JSON.
 *
 * Full matrix SSOT: AGENTS.md#grounded-capability-map
 * Compact bake: public/registry/capability-map-subset.json
 *
 *   bun run bake:capabilities
 *   bun run bake:capabilities:check
 */

export const CAPABILITY_MAP_SUBSET_KIND = 'capability-map-subset' as const;
/** v2: explicit type + protocol (+ bunApi/protonCli kept for drill-down). */
export const CAPABILITY_MAP_SUBSET_SCHEMA = 2 as const;
export const CAPABILITY_MAP_SUBSET_REL = 'public/registry/capability-map-subset.json';
export const CAPABILITY_MAP_SOURCE = 'AGENTS.md#grounded-capability-map';

/** Runtime surface: Bun APIs vs Proton Pass CLI vs both. */
export type CapabilityProtocol = 'Bun' | 'pass-cli' | 'Bun + pass-cli' | '—';

export type CapabilityMapRow = {
  capability: string;
  /** Primary call signature (Bun preferred when both present). */
  api: string;
  status: string;
  usedIn: string;
  /** Domain class from AGENTS table (config · secrets · runtime · pkg · …). */
  type: string;
  /** Version constraint string (e.g. Bun ≥1.0 · pass‑cli ≥2.2). */
  version: string;
  /** Which protocol family the API belongs to. */
  protocol: CapabilityProtocol;
  /** Raw Bun API cell (may be —). */
  bunApi?: string;
  /** Raw Proton CLI cell (may be —). */
  protonCli?: string;
};

export type CapabilityMapSubset = {
  kind: typeof CAPABILITY_MAP_SUBSET_KIND;
  schemaVersion: typeof CAPABILITY_MAP_SUBSET_SCHEMA;
  source: string;
  note: string;
  generatedAt: string;
  rowCount: number;
  rows: CapabilityMapRow[];
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

function isDash(s: string): boolean {
  const t = s.trim();
  return !t || t === '—' || t === '-' || t === '–' || t === '—';
}

/**
 * Prefer Bun API when present; else Proton CLI; never invent values.
 */
export function pickApiCell(bunApi: string, protonCli: string): string {
  const bun = stripMdCell(bunApi);
  let proton = stripMdCell(protonCli);
  // Drop parenthetical "not item get" clarifiers from AGENTS table cells
  proton = proton.replace(/\s*\(not\s+[^)]+\)/gi, '').trim();
  if (!isDash(bun)) return bun;
  if (!isDash(proton)) return proton;
  return bun || proton || '—';
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
  return '—';
}

/**
 * Parse AGENTS.md grounded capability map markdown table into rows.
 * Expects header containing "Capability" and "Status".
 */
export function parseCapabilityTableFromMarkdown(md: string): CapabilityMapRow[] {
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
  if (iCap < 0 || iStatus < 0 || iUsed < 0) {
    throw new Error(`Capability table missing columns: got [${headers.join(', ')}]`);
  }

  const rows: CapabilityMapRow[] = [];
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
    const bunApiRaw = iBun >= 0 ? (parts[iBun] ?? '—') : '—';
    const protonRaw = iProton >= 0 ? (parts[iProton] ?? '—') : '—';
    const bunApi = stripMdCell(bunApiRaw);
    let protonCli = stripMdCell(protonRaw);
    protonCli = protonCli.replace(/\s*\(not\s+[^)]+\)/gi, '').trim() || '—';
    const status = stripMdCell(parts[iStatus] ?? '—');
    const usedIn = stripMdCell(parts[iUsed] ?? '—');
    const type = iType >= 0 ? stripMdCell(parts[iType] ?? '') : '';
    const version = iVer >= 0 ? stripMdCell(parts[iVer] ?? '') : '';
    const row: CapabilityMapRow = {
      capability,
      api: pickApiCell(bunApiRaw, protonRaw),
      status,
      usedIn,
      type: type || '—',
      version: version || '—',
      protocol: pickProtocol(bunApiRaw, protonRaw),
      bunApi: isDash(bunApi) ? '—' : bunApi,
      protonCli: isDash(protonCli) ? '—' : protonCli,
    };
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error('Capability map table parsed zero data rows');
  }
  return rows;
}

export function buildCapabilityMapSubset(
  md: string,
  generatedAt = new Date().toISOString()
): CapabilityMapSubset {
  const rows = parseCapabilityTableFromMarkdown(md);
  return {
    kind: CAPABILITY_MAP_SUBSET_KIND,
    schemaVersion: CAPABILITY_MAP_SUBSET_SCHEMA,
    source: CAPABILITY_MAP_SOURCE,
    note: 'Compact portal tools-hub rows (type · protocol · api · version). Full matrix: AGENTS.md. Generated by bake:capabilities. No secret values.',
    generatedAt,
    rowCount: rows.length,
    rows,
  };
}

export function serializeCapabilityMapSubset(payload: CapabilityMapSubset): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/** Stable compare ignoring generatedAt. */
export function capabilityMapSubsetFingerprint(payload: CapabilityMapSubset): string {
  const { generatedAt: _g, ...rest } = payload;
  return JSON.stringify(rest);
}

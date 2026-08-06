// @see https://bun.com/docs/runtime/file-io — Bun.file (consumers)
/**
 * REF:ID v2 — section-number path identifiers for design-doc flags / TOC.
 *
 * Format: `{section}.{keyword}` where `section` is a dotted number path
 * (e.g. `4.1`) and `keyword` is one or more kebab-case segments
 * (e.g. `refresh`, `max-age-days`, `shared.prefer-local`).
 *
 * Rules (error unless noted):
 *  - kebab-case keyword segments · 2–32 chars · no leading/trailing hyphens
 *  - reserved leaves: index · top · toc · anchor
 *  - globally unique within a document
 *  - flag rows: href MUST be `#` + REF:ID
 *  - every table REF:ID must have matching `<a id="…">`
 *  - format soft-warns can be promoted with `strictFormat`
 *  - orphaned anchors warn (anchor with no table/TOC/tool reference)
 *
 * Baseline: PR #501 (`docs/design/bun-types-inventory.md` §4.1).
 */
export const REF_ID_SCHEMA = 'factorywager/ref-id/v2' as const;

/** Leaves that collide with generated anchors / TOC chrome. */
export const RESERVED_REF_ID_KEYWORDS = new Set(['index', 'top', 'toc', 'anchor']);

/** One keyword segment: kebab-case, length 2–32, no leading/trailing hyphen. */
const KEYWORD_SEGMENT_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$|^[a-z0-9]$/;

/**
 * Full REF:ID: section digits (optional .digits…) then one+ keyword segments.
 * Examples: `4.1.refresh` · `4.1.max-age-days` · `4.1.shared.prefer-local`
 */
export const REF_ID_RE = /^(\d+(?:\.\d+)*)\.([a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*)$/;

/** Section-only id used for TOC (e.g. `4.1`). */
export const REF_SECTION_RE = /^\d+(?:\.\d+)*$/;

export type RefIdSeverity = 'error' | 'warn';

export type RefIdIssueKind =
  | 'invalid-format'
  | 'reserved-keyword'
  | 'keyword-length'
  | 'leading-trailing-hyphen'
  | 'duplicate-ref-id'
  | 'duplicate-anchor'
  | 'missing-anchor'
  | 'href-mismatch'
  | 'toc-href-mismatch'
  | 'orphan-anchor'
  | 'section-placement'
  | 'comment-missing-anchor';

export type RefIdIssue = {
  severity: RefIdSeverity;
  kind: RefIdIssueKind;
  file: string;
  line?: number;
  refId?: string; // brand-ok — design-doc fragment key (REF:ID v2), not domain brand
  detail: string;
};

export type ParsedRefId = {
  /** Full REF:ID string */
  id: string; // brand-ok — HTML/Markdown fragment id, not domain brand
  /** Section number path, e.g. `4.1` */
  section: string;
  /** Keyword path after section, e.g. `refresh` or `shared.prefer-local` */
  keyword: string;
  /** Keyword segments */
  segments: string[];
};

export type HtmlAnchor = {
  id: string; // brand-ok — HTML/Markdown fragment id, not domain brand
  line: number;
};

export type FlagTableRow = {
  script: string;
  refId: string; // brand-ok — design-doc fragment key (REF:ID v2), not domain brand
  href: string;
  line: number;
};

export type TocLink = {
  label: string;
  href: string;
  line: number;
};

export type RefIdDocScan = {
  file: string;
  anchors: HtmlAnchor[];
  flagRows: FlagTableRow[];
  tocLinks: TocLink[];
  /** <!-- REF:ID 4.1.refresh --> comments */
  commentRefs: Array<{ refId: string; line: number }>; // brand-ok — REF:ID fragment keys
};

/** Tooling-side flag row (e.g. StatusFlagRow). */
export type ToolFlagRef = {
  refId: string; // brand-ok — design-doc fragment key (REF:ID v2), not domain brand
  href: string;
  /** Optional origin label for error messages */
  source?: string;
};

export function parseRefId(raw: string): ParsedRefId | null {
  const id = raw.trim();
  const m = id.match(REF_ID_RE);
  if (!m) return null;
  const section = m[1]!;
  const keyword = m[2]!;
  return { id, section, keyword, segments: keyword.split('.') };
}

/** Format issues for a single REF:ID (does not check uniqueness). */
export function validateRefIdFormat(
  raw: string,
  opts: { strictFormat?: boolean } = {}
): Array<{ severity: RefIdSeverity; kind: RefIdIssueKind; detail: string }> {
  const out: Array<{ severity: RefIdSeverity; kind: RefIdIssueKind; detail: string }> = [];
  const warn: RefIdSeverity = opts.strictFormat ? 'error' : 'warn';
  const id = raw.trim();
  const parsed = parseRefId(id);
  if (!parsed) {
    out.push({
      severity: 'error',
      kind: 'invalid-format',
      detail: `REF:ID must match {section}.{kebab-keyword} (got '${id}')`,
    });
    return out;
  }
  for (const seg of parsed.segments) {
    if (seg.startsWith('-') || seg.endsWith('-')) {
      out.push({
        severity: 'error',
        kind: 'leading-trailing-hyphen',
        detail: `keyword segment '${seg}' must not start/end with '-'`,
      });
    }
    if (seg.length < 2 || seg.length > 32) {
      out.push({
        severity: warn,
        kind: 'keyword-length',
        detail: `keyword segment '${seg}' length ${seg.length} (want 2–32)`,
      });
    }
    if (!KEYWORD_SEGMENT_RE.test(seg) || /[A-Z_]/.test(seg) || seg.includes('--')) {
      out.push({
        severity: warn,
        kind: 'invalid-format',
        detail: `keyword segment '${seg}' must be kebab-case [a-z0-9-]`,
      });
    }
    if (RESERVED_REF_ID_KEYWORDS.has(seg)) {
      out.push({
        severity: 'error',
        kind: 'reserved-keyword',
        detail: `keyword segment '${seg}' is reserved (index|top|toc|anchor)`,
      });
    }
  }
  return out;
}

/** href for a REF:ID — always `#` + id. */
export function hrefFromRefId(refId: string): string {
  // brand-ok — REF:ID fragment
  return `#${refId.trim()}`;
}

export function extractHtmlAnchors(text: string, file: string): HtmlAnchor[] {
  const anchors: HtmlAnchor[] = [];
  const lines = text.split(/\r?\n/);
  // <a id="…"> or <a id='…'>
  const re = /<a\s+[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      anchors.push({ id: m[1]!, line: i + 1 });
    }
  }
  void file;
  return anchors;
}

export function extractCommentRefIds(text: string): Array<{ refId: string; line: number }> {
  // brand-ok — REF:ID fragments
  const out: Array<{ refId: string; line: number }> = []; // brand-ok — REF:ID fragments
  const lines = text.split(/\r?\n/);
  const re = /<!--\s*REF:ID\s+([^\s]+)\s*-->/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(re);
    if (m) out.push({ refId: m[1]!.trim(), line: i + 1 });
  }
  return out;
}

/**
 * Parse a markdown pipe table that has REF:ID and href columns.
 * Header row must include those names (case-insensitive).
 */
export function extractFlagTableRows(text: string, file: string): FlagTableRow[] {
  const lines = text.split(/\r?\n/);
  const rows: FlagTableRow[] = [];
  let headers: string[] | null = null;
  let refIdx = -1;
  let hrefIdx = -1;
  let scriptIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line.startsWith('|')) {
      headers = null;
      continue;
    }
    const cells = splitTableRow(line);
    if (cells.length < 2) continue;
    // separator | --- | --- |
    if (cells.every(c => /^:?-+:?$/.test(c.replace(/\s/g, '')))) continue;

    if (!headers) {
      const lower = cells.map(c => c.toLowerCase());
      refIdx = lower.findIndex(c => c === 'ref:id' || c === 'refid' || c === 'ref id');
      hrefIdx = lower.findIndex(c => c === 'href');
      scriptIdx = lower.findIndex(c => c === 'script');
      if (refIdx >= 0 && hrefIdx >= 0) {
        headers = cells;
      }
      continue;
    }

    const refId = stripMd(cells[refIdx] ?? '');
    const href = stripMd(cells[hrefIdx] ?? '');
    if (!refId) continue;
    rows.push({
      script: stripMd(cells[scriptIdx] ?? '') || '—',
      refId,
      href,
      line: i + 1,
    });
  }
  void file;
  return rows;
}

/** TOC / Contents links: `[label](#fragment)` under a ## Contents section-ish. */
export function extractTocFragmentLinks(text: string): TocLink[] {
  const out: TocLink[] = [];
  const lines = text.split(/\r?\n/);
  const linkRe = /\[([^\]]+)\]\((#[^)]+)\)/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // Prefer numbered TOC lines: `1. […` or `   - [4.1 …`
    if (!/^\s*(\d+\.|-|\*)\s+\[/.test(line) && !/^\s*-\s+\[\d/.test(line)) {
      // still pick explicit section-number fragments in list-ish lines
      if (!/^\s{0,3}(\d+\.|-|\*)/.test(line)) continue;
    }
    linkRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(line)) !== null) {
      out.push({ label: m[1]!, href: m[2]!, line: i + 1 });
    }
  }
  return out;
}

export function scanMarkdownRefIds(text: string, file: string): RefIdDocScan {
  return {
    file,
    anchors: extractHtmlAnchors(text, file),
    flagRows: extractFlagTableRows(text, file),
    tocLinks: extractTocFragmentLinks(text),
    commentRefs: extractCommentRefIds(text),
  };
}

export type CheckRefIdDocOpts = {
  /** Promote format warns to errors */
  strictFormat?: boolean;
  /** Tooling rows that must match anchors (e.g. bun:types-status flags) */
  toolFlags?: readonly ToolFlagRef[];
  /** When true, missing tool↔doc rows are errors */
  requireToolCoverage?: boolean;
  /** Section id that must sit on the previous non-empty line above `sectionHeading`. */
  sectionRefId?: string;
  /** Exact markdown heading line, e.g. `### Flags / settings`. */
  sectionHeading?: string;
};

/** Empty / em-dash href cells are treated as `#` + REF:ID. */
export function isEmptyHrefCell(href: string): boolean {
  const h = href.trim();
  return h === '' || h === '—' || h === '-' || h === '–';
}

/**
 * Validate one markdown file against REF:ID v2 rules.
 */
export function checkRefIdDocument(
  text: string,
  file: string,
  opts: CheckRefIdDocOpts = {}
): RefIdIssue[] {
  const issues: RefIdIssue[] = [];
  const scan = scanMarkdownRefIds(text, file);
  const anchorIds = new Map<string, number[]>(); // id → lines
  for (const a of scan.anchors) {
    const list = anchorIds.get(a.id) ?? [];
    list.push(a.line);
    anchorIds.set(a.id, list);
  }

  // duplicate anchors
  for (const [id, lines] of anchorIds) {
    if (lines.length > 1) {
      issues.push({
        severity: 'error',
        kind: 'duplicate-anchor',
        file,
        line: lines[0],
        refId: id,
        detail: `duplicate <a id="${id}"> at lines ${lines.join(', ')}`,
      });
    }
  }

  const seenTableRef = new Map<string, number>();
  for (const row of scan.flagRows) {
    // format
    for (const f of validateRefIdFormat(row.refId, { strictFormat: opts.strictFormat })) {
      issues.push({
        severity: f.severity,
        kind: f.kind,
        file,
        line: row.line,
        refId: row.refId,
        detail: f.detail,
      });
    }
    // uniqueness in table
    if (seenTableRef.has(row.refId)) {
      issues.push({
        severity: 'error',
        kind: 'duplicate-ref-id',
        file,
        line: row.line,
        refId: row.refId,
        detail: `duplicate REF:ID in flags table (also line ${seenTableRef.get(row.refId)})`,
      });
    } else {
      seenTableRef.set(row.refId, row.line);
    }
    // href match — empty / — soft-accepts as #REF:ID
    const expected = hrefFromRefId(row.refId);
    if (!isEmptyHrefCell(row.href) && row.href !== expected) {
      issues.push({
        severity: 'error',
        kind: 'href-mismatch',
        file,
        line: row.line,
        refId: row.refId,
        detail: `href '${row.href}' must equal '${expected}' (or empty/— to imply it)`,
      });
    }
    // anchor exists
    if (!anchorIds.has(row.refId)) {
      issues.push({
        severity: 'error',
        kind: 'missing-anchor',
        file,
        line: row.line,
        refId: row.refId,
        detail: `REF:ID '${row.refId}' has no matching <a id="${row.refId}">`,
      });
    }
  }

  // <!-- REF:ID X --> must have matching <a id="X">
  for (const c of scan.commentRefs) {
    if (!anchorIds.has(c.refId)) {
      issues.push({
        severity: 'error',
        kind: 'comment-missing-anchor',
        file,
        line: c.line,
        refId: c.refId,
        detail: `comment REF:ID '${c.refId}' has no matching <a id="${c.refId}">`,
      });
    }
  }

  // Section placement: sectionRefId on previous non-empty line above heading
  if (opts.sectionRefId && opts.sectionHeading) {
    const lines = text.split(/\r?\n/);
    const headingIdx = lines.findIndex(l => l.trim() === opts.sectionHeading!.trim());
    if (headingIdx < 0) {
      issues.push({
        severity: 'error',
        kind: 'section-placement',
        file,
        refId: opts.sectionRefId,
        detail: `heading not found: ${opts.sectionHeading}`,
      });
    } else {
      let prev = headingIdx - 1;
      while (prev >= 0 && lines[prev]!.trim() === '') prev--;
      const prevLine = prev >= 0 ? lines[prev]! : '';
      if (!prevLine.includes(`id="${opts.sectionRefId}"`)) {
        issues.push({
          severity: 'error',
          kind: 'section-placement',
          file,
          line: headingIdx + 1,
          refId: opts.sectionRefId,
          detail: `expected <a id="${opts.sectionRefId}"> on the line immediately above heading`,
        });
      }
    }
  }

  // TOC: if fragment looks like a REF section or REF:ID, require anchor
  for (const toc of scan.tocLinks) {
    const frag = toc.href.startsWith('#') ? toc.href.slice(1) : toc.href;
    if (!frag) continue;
    const isRefLike = REF_SECTION_RE.test(frag) || parseRefId(frag) != null;
    if (!isRefLike) continue;
    if (!anchorIds.has(frag)) {
      issues.push({
        severity: 'error',
        kind: 'toc-href-mismatch',
        file,
        line: toc.line,
        refId: frag,
        detail: `TOC link '${toc.href}' has no matching <a id="${frag}">`,
      });
    }
  }

  // tool flags
  if (opts.toolFlags) {
    for (const t of opts.toolFlags) {
      for (const f of validateRefIdFormat(t.refId, { strictFormat: opts.strictFormat })) {
        issues.push({
          severity: f.severity,
          kind: f.kind,
          file: t.source ?? file,
          refId: t.refId,
          detail: `tool flag: ${f.detail}`,
        });
      }
      const expected = hrefFromRefId(t.refId);
      if (t.href !== expected) {
        issues.push({
          severity: 'error',
          kind: 'href-mismatch',
          file: t.source ?? file,
          refId: t.refId,
          detail: `tool flag href '${t.href}' must equal '${expected}'`,
        });
      }
      if (!anchorIds.has(t.refId)) {
        issues.push({
          severity: 'error',
          kind: 'missing-anchor',
          file,
          refId: t.refId,
          detail: `tool REF:ID '${t.refId}' has no <a id> in ${file}`,
        });
      }
      if (opts.requireToolCoverage && !seenTableRef.has(t.refId)) {
        issues.push({
          severity: 'warn',
          kind: 'orphan-anchor',
          file,
          refId: t.refId,
          detail: `tool REF:ID '${t.refId}' not listed in markdown flags table`,
        });
      }
    }
  }

  // orphaned anchors (warn): not referenced by table, toc, comments, or tool flags
  const referenced = new Set<string>([
    ...seenTableRef.keys(),
    ...scan.tocLinks.map(t => (t.href.startsWith('#') ? t.href.slice(1) : t.href)),
    ...scan.commentRefs.map(c => c.refId),
    ...(opts.toolFlags?.map(t => t.refId) ?? []),
  ]);
  for (const [id, lines] of anchorIds) {
    if (referenced.has(id)) continue;
    // ignore non-ref-like anchors (slug headings)
    if (!REF_SECTION_RE.test(id) && !parseRefId(id)) continue;
    issues.push({
      severity: 'warn',
      kind: 'orphan-anchor',
      file,
      line: lines[0],
      refId: id,
      detail: `anchor id='${id}' is not referenced by flags table, TOC, comments, or tool flags`,
    });
  }

  return issues;
}

/** Suggest next REF:ID under a section for a keyword leaf. */
export function suggestRefId(section: string, keyword: string, taken: ReadonlySet<string>): string {
  const base = `${section.replace(/^#+/, '').trim()}.${keyword.trim().toLowerCase()}`;
  if (!taken.has(base) && parseRefId(base)) return base;
  let n = 2;
  while (n < 1000) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate) && parseRefId(candidate)) return candidate;
    n++;
  }
  return base;
}

/** Collect taken REF:IDs from a scanned doc + optional tool flags. */
export function collectTakenRefIds(
  scan: RefIdDocScan,
  toolFlags?: readonly ToolFlagRef[]
): Set<string> {
  const taken = new Set<string>();
  for (const a of scan.anchors) taken.add(a.id);
  for (const r of scan.flagRows) taken.add(r.refId);
  for (const c of scan.commentRefs) taken.add(c.refId);
  for (const t of scan.tocLinks) {
    const frag = t.href.startsWith('#') ? t.href.slice(1) : t.href;
    if (frag) taken.add(frag);
  }
  for (const t of toolFlags ?? []) taken.add(t.refId);
  return taken;
}

export type SuggestRefIdResult = {
  refId: string;
  href: string;
  section: string;
  keyword: string;
  taken: boolean;
  paste: {
    anchor: string;
    comment: string;
    tableCells: string;
  };
};

/** Build suggest result + copy-paste snippet for Flags table / anchors. */
export function buildSuggestRefIdResult(
  section: string,
  keyword: string,
  taken: ReadonlySet<string>
): SuggestRefIdResult {
  const refId = suggestRefId(section, keyword, taken);
  const href = hrefFromRefId(refId);
  const base = `${section.replace(/^#+/, '').trim()}.${keyword.trim().toLowerCase()}`;
  return {
    refId,
    href,
    section: section.replace(/^#+/, '').trim(),
    keyword: keyword.trim().toLowerCase(),
    taken: taken.has(base),
    paste: {
      anchor: `<a id="${refId}"></a>`,
      comment: `<!-- REF:ID ${refId} -->`,
      tableCells: `| \`bun:types-status\` | \`${refId}\` | [\`${href}\`](${href}) | \`--${keyword.trim().toLowerCase()}\` | — | off | — |`,
    },
  };
}

/**
 * Fill empty / — href cells in Flags tables with `[`#id`](#id)`.
 * Returns rewritten markdown and count of cells filled.
 */
export function fillEmptyHrefCells(text: string): { text: string; filled: number } {
  const lines = text.split(/\r?\n/);
  let headers: string[] | null = null;
  let refIdx = -1;
  let hrefIdx = -1;
  let filled = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = raw.trim();
    if (!line.startsWith('|')) {
      headers = null;
      continue;
    }
    const cells = splitTableRow(line);
    if (cells.length < 2) continue;
    if (cells.every(c => /^:?-+:?$/.test(c.replace(/\s/g, '')))) continue;

    if (!headers) {
      const lower = cells.map(c => c.toLowerCase());
      refIdx = lower.findIndex(c => c === 'ref:id' || c === 'refid' || c === 'ref id');
      hrefIdx = lower.findIndex(c => c === 'href');
      if (refIdx >= 0 && hrefIdx >= 0) headers = cells;
      continue;
    }

    const refId = stripMd(cells[refIdx] ?? '');
    const hrefRaw = cells[hrefIdx] ?? '';
    const href = stripMd(hrefRaw);
    if (!refId || !isEmptyHrefCell(href)) continue;

    const expected = hrefFromRefId(refId);
    cells[hrefIdx] = `[\`${expected}\`](${expected})`;
    lines[i] = `| ${cells.join(' | ')} |`;
    filled++;
  }

  return { text: lines.join('\n'), filled };
}

function splitTableRow(line: string): string[] {
  const raw = line.trim();
  const inner = raw.startsWith('|') ? raw.slice(1) : raw;
  const end = inner.endsWith('|') ? inner.slice(0, -1) : inner;
  return end.split('|').map(c => c.trim());
}

function stripMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$2') // prefer href target for link cells
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

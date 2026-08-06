/**
 * Section-number REF:ID validation (Contents path + HTML anchors).
 *
 * Lexicon: `4.1.refresh` — numeric section + kebab-case keyword segments.
 * Not lane hygiene `#REF:lane:*` (different scheme).
 *
 * @see docs/design/bun-types-inventory.md
 */

export const RESERVED_REFID_KEYWORDS = new Set(['index', 'top', 'toc', 'anchor']);

/** Section-only: `4`, `4.1` */
const SECTION_ONLY_RE = /^\d+(?:\.\d+)*$/;
/** Leaf: section + at least one kebab keyword segment */
const LEAF_REF_RE = /^(\d+(?:\.\d+)*)((?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+)$/;
const KEYWORD_SEG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type RefIdSeverity = 'error' | 'warn';

export type RefIdIssueKind =
  | 'refid-duplicate-anchor'
  | 'refid-missing-anchor'
  | 'refid-href-mismatch'
  | 'refid-reserved-keyword'
  | 'refid-format'
  | 'refid-orphan-anchor'
  | 'refid-section-placement'
  | 'refid-toc-mismatch';

export type RefIdIssue = {
  kind: RefIdIssueKind;
  severity: RefIdSeverity;
  file: string;
  line?: number;
  target: string;
  detail?: string;
};

export type ToolingRef = {
  refId: string;
  href: string;
};

export type CheckRefIdDocumentOpts = {
  path: string;
  text: string;
  toolingRefs?: readonly ToolingRef[];
  /** Section id that must sit immediately above `sectionHeading` (e.g. `4.1`). */
  sectionRefId?: string;
  /** Markdown heading line (exact), e.g. `### Flags / settings`. */
  sectionHeading?: string;
  /** When true, format warnings become errors. */
  strict?: boolean;
};

export function isSectionOnlyRefId(id: string): boolean {
  return SECTION_ONLY_RE.test(id);
}

/** Leaf or section-only section-number REF:ID. */
export function isSectionRefId(id: string): boolean {
  return isSectionOnlyRefId(id) || LEAF_REF_RE.test(id);
}

export function parseRefId(
  id: string
): { ok: true; section: string; keywords: string[] } | { ok: false; reason: string } {
  if (isSectionOnlyRefId(id)) {
    return { ok: true, section: id, keywords: [] };
  }
  const m = LEAF_REF_RE.exec(id);
  if (!m) {
    return { ok: false, reason: 'not a section-number REF:ID' };
  }
  const section = m[1]!;
  const keywords = m[2]!.slice(1).split('.');
  return { ok: true, section, keywords };
}

export type KeywordValidation =
  { ok: true } | { ok: false; severity: RefIdSeverity; reason: string };

export function validateKeyword(seg: string): KeywordValidation {
  if (RESERVED_REFID_KEYWORDS.has(seg)) {
    return { ok: false, severity: 'error', reason: `reserved keyword '${seg}'` };
  }
  if (seg.startsWith('-') || seg.endsWith('-')) {
    return {
      ok: false,
      severity: 'error',
      reason: 'keyword must not have leading/trailing hyphens',
    };
  }
  if (seg.length < 2 || seg.length > 32) {
    return {
      ok: false,
      severity: 'warn',
      reason: `keyword length ${seg.length} outside 2–32`,
    };
  }
  if (!KEYWORD_SEG_RE.test(seg)) {
    return {
      ok: false,
      severity: 'warn',
      reason: 'keyword must be kebab-case [a-z0-9]+(-[a-z0-9]+)*',
    };
  }
  return { ok: true };
}

export type HtmlAnchor = { id: string; line: number };

export function extractHtmlAnchors(text: string): HtmlAnchor[] {
  const out: HtmlAnchor[] = [];
  const re = /<a\s+id="([^"]+)"\s*>\s*<\/a>/gi;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      out.push({ id: m[1]!, line: i + 1 });
    }
  }
  return out;
}

/** Backtick-wrapped tokens that look like section REF:IDs. */
export function extractBacktickRefIds(text: string): Array<{ refId: string; line: number }> {
  const out: Array<{ refId: string; line: number }> = [];
  const re = /`([^`]+)`/g;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const tok = m[1]!;
      if (isSectionRefId(tok)) out.push({ refId: tok, line: i + 1 });
    }
  }
  return out;
}

/** TOC / markdown links whose URL is a bare `#fragment`. */
export function extractHashLinks(
  text: string
): Array<{ fragment: string; line: number; label: string }> {
  const out: Array<{ fragment: string; line: number; label: string }> = [];
  const re = /\[([^\]]*)\]\((#[^)]+)\)/g;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const frag = m[2]!.slice(1);
      out.push({ fragment: frag, line: i + 1, label: m[1]! });
    }
  }
  return out;
}

/**
 * Flags-table rows: REF:ID in col + href markdown link `[`#id`](#id)`.
 */
export function extractFlagsTableRefs(
  text: string
): Array<{ refId: string; href: string; line: number }> {
  const out: Array<{ refId: string; href: string; line: number }> = [];
  const rowRe = /^\|[^|]*\|\s*`([^`]+)`\s*\|\s*\[`?(#[^`\]]+)`?\]\((#[^)]+)\)\s*\|/;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = rowRe.exec(lines[i]!);
    if (!m) continue;
    const refId = m[1]!;
    if (!isSectionRefId(refId)) continue;
    const hrefLabel = m[2]!;
    const hrefTarget = m[3]!;
    out.push({
      refId,
      href: hrefTarget.startsWith('#') ? hrefTarget : hrefLabel,
      line: i + 1,
    });
  }
  return out;
}

function bumpSeverity(strict: boolean, sev: RefIdSeverity): RefIdSeverity {
  if (strict && sev === 'warn') return 'error';
  return sev;
}

export function checkRefIdDocument(opts: CheckRefIdDocumentOpts): RefIdIssue[] {
  const { path: file, text, toolingRefs = [], strict = false } = opts;
  const issues: RefIdIssue[] = [];
  const push = (issue: RefIdIssue) => {
    issues.push({
      ...issue,
      severity: bumpSeverity(strict, issue.severity),
    });
  };

  const anchors = extractHtmlAnchors(text);
  const byId = new Map<string, HtmlAnchor[]>();
  for (const a of anchors) {
    const list = byId.get(a.id) ?? [];
    list.push(a);
    byId.set(a.id, list);
  }
  for (const [id, list] of byId) {
    if (list.length > 1) {
      for (const a of list.slice(1)) {
        push({
          kind: 'refid-duplicate-anchor',
          severity: 'error',
          file,
          line: a.line,
          target: id,
          detail: `duplicate <a id> (first at line ${list[0]!.line})`,
        });
      }
    }
  }

  const tableRefs = extractFlagsTableRefs(text);
  const hashLinks = extractHashLinks(text);
  const backtickRefs = extractBacktickRefIds(text);

  const referenced = new Set<string>();
  for (const t of tableRefs) referenced.add(t.refId);
  for (const t of toolingRefs) referenced.add(t.refId);
  for (const h of hashLinks) {
    if (isSectionRefId(h.fragment)) referenced.add(h.fragment);
  }
  if (opts.sectionRefId) referenced.add(opts.sectionRefId);

  for (const t of tableRefs) {
    const parsed = parseRefId(t.refId);
    if (!parsed.ok) {
      push({
        kind: 'refid-format',
        severity: 'warn',
        file,
        line: t.line,
        target: t.refId,
        detail: parsed.reason,
      });
      continue;
    }
    for (const kw of parsed.keywords) {
      const v = validateKeyword(kw);
      if (!v.ok) {
        push({
          kind: v.severity === 'error' ? 'refid-reserved-keyword' : 'refid-format',
          severity: v.severity,
          file,
          line: t.line,
          target: t.refId,
          detail: v.reason,
        });
      }
    }
    if (!byId.has(t.refId)) {
      push({
        kind: 'refid-missing-anchor',
        severity: 'error',
        file,
        line: t.line,
        target: t.refId,
        detail: 'Flags table REF:ID has no matching <a id>',
      });
    }
    const expected = `#${t.refId}`;
    if (t.href !== expected) {
      push({
        kind: 'refid-href-mismatch',
        severity: 'error',
        file,
        line: t.line,
        target: t.refId,
        detail: `href ${t.href} !== ${expected}`,
      });
    }
  }

  for (const t of toolingRefs) {
    if (!byId.has(t.refId)) {
      push({
        kind: 'refid-missing-anchor',
        severity: 'error',
        file,
        target: t.refId,
        detail: 'tooling REF:ID has no matching <a id>',
      });
    }
    const expected = `#${t.refId}`;
    if (t.href !== expected) {
      push({
        kind: 'refid-href-mismatch',
        severity: 'error',
        file,
        target: t.refId,
        detail: `tooling href ${t.href} !== ${expected}`,
      });
    }
    const parsedTool = parseRefId(t.refId);
    if (parsedTool.ok) {
      for (const kw of parsedTool.keywords) {
        const v = validateKeyword(kw);
        if (!v.ok) {
          push({
            kind: v.severity === 'error' ? 'refid-reserved-keyword' : 'refid-format',
            severity: v.severity,
            file,
            target: t.refId,
            detail: `tooling: ${v.reason}`,
          });
        }
      }
    }
  }

  for (const h of hashLinks) {
    if (!isSectionRefId(h.fragment)) continue;
    if (!byId.has(h.fragment)) {
      push({
        kind: 'refid-toc-mismatch',
        severity: 'error',
        file,
        line: h.line,
        target: h.fragment,
        detail: `link [${h.label}](#${h.fragment}) has no matching <a id>`,
      });
    }
  }

  if (opts.sectionRefId && opts.sectionHeading) {
    const lines = text.split('\n');
    const headingIdx = lines.findIndex(l => l.trim() === opts.sectionHeading!.trim());
    if (headingIdx < 0) {
      push({
        kind: 'refid-section-placement',
        severity: 'error',
        file,
        target: opts.sectionRefId,
        detail: `heading not found: ${opts.sectionHeading}`,
      });
    } else {
      let prev = headingIdx - 1;
      while (prev >= 0 && lines[prev]!.trim() === '') prev--;
      const prevLine = prev >= 0 ? lines[prev]! : '';
      if (!prevLine.includes(`id="${opts.sectionRefId}"`)) {
        push({
          kind: 'refid-section-placement',
          severity: 'error',
          file,
          line: headingIdx + 1,
          target: opts.sectionRefId,
          detail: `expected <a id="${opts.sectionRefId}"> on the line immediately above heading`,
        });
      }
    }
  }

  for (const a of anchors) {
    if (!isSectionRefId(a.id)) continue;
    if (!referenced.has(a.id)) {
      // Still referenced if only in backticks as prose
      const usedInBackticks = backtickRefs.some(b => b.refId === a.id);
      if (!usedInBackticks) {
        push({
          kind: 'refid-orphan-anchor',
          severity: 'warn',
          file,
          line: a.line,
          target: a.id,
          detail: 'anchor unused by Flags table, tooling, or TOC hash links',
        });
      }
    }
  }

  return issues;
}

/** Allowlisted docs that opt into section-number REF:ID checks. */
export const REFID_DOC_ALLOWLIST = [
  {
    path: 'docs/design/bun-types-inventory.md',
    sectionRefId: '4.1',
    sectionHeading: '### Flags / settings',
  },
] as const;

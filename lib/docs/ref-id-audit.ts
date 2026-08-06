// @see https://bun.com/docs/runtime/file-io — Bun.file (consumers)
/**
 * REF:ID audit — discover markdown that has (or lacks) numbered REF:IDs / Flags tables.
 *
 * Used by `docs:refid audit` and `check --dry-run` inventory. Pure scan helpers;
 * registry membership is passed in from tools.
 */
import {
  extractFlagTableRows,
  extractHtmlAnchors,
  extractTocFragmentLinks,
  parseRefId,
  REF_SECTION_RE,
  type RefIdIssue,
} from './ref-id.ts';

export type MdRefIdClass =
  'registered' | 'refid-complete' | 'flags-table-only' | 'numbered-anchors-only' | 'clean';

export type MdRefIdAction = 'keep-registered' | 'candidate-promote' | 'leave-as-is' | 'not-needed';

export type MdRefIdAuditRow = {
  file: string;
  class: MdRefIdClass;
  action: MdRefIdAction;
  numberedAnchors: number;
  refIdTableRows: number;
  operatorFlagTables: number;
  numberedTocLinks: number;
  sampleAnchors: string[];
  note: string;
};

export type OperatorFlagTableHit = {
  line: number;
  headers: string[];
};

/**
 * Detect pipe tables that look like operator flag tables (Flag / --flag column)
 * but do **not** have REF:ID + href columns.
 */
export function extractOperatorFlagTables(text: string): OperatorFlagTableHit[] {
  const lines = text.split(/\r?\n/);
  const hits: OperatorFlagTableHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line.startsWith('|')) continue;
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(c => c.trim());
    if (cells.length < 2) continue;
    if (cells.every(c => /^:?-+:?$/.test(c.replace(/\s/g, '')))) continue;
    const lower = cells.map(c => c.toLowerCase());
    const hasRefId = lower.some(c => c === 'ref:id' || c === 'refid' || c === 'ref id');
    const hasHref = lower.some(c => c === 'href');
    if (hasRefId && hasHref) continue;
    // Board maps (portal-ops-board-map): "Flags" is a data column next to Command/Label —
    // not an operator Flag options table. Skip those.
    const boardMapish =
      lower.includes('short id') ||
      lower.includes('shortid') ||
      (lower.includes('command') && lower.includes('label')) ||
      (lower.includes('command') && lower.includes('flags') && lower[0] !== 'flag');
    if (boardMapish) continue;
    // Prefer explicit Flag/Flags/--flag as the *primary* options column.
    // Bare "Option"/"Options" alone is too noisy (design A/B/C tables); only accept
    // when a nearby data row has a `--cli-flag` token in that cell.
    const hasExplicitFlagCol = lower.some(
      c =>
        c === 'flag' ||
        c === 'flags' ||
        c === '--flag' ||
        c.includes('cli flag') ||
        c === 'cli flag' ||
        c === 'cli flags'
    );
    // Require Flag column first (or sole flag-like header among ≤3 cols) so multi-
    // column inventory tables with a trailing Flags field are ignored.
    const flagColIdx = lower.findIndex(
      c => c === 'flag' || c === 'flags' || c === '--flag' || c.includes('cli flag')
    );
    if (hasExplicitFlagCol && flagColIdx > 0 && cells.length > 3) continue;
    const hasOptionCol = lower.some(c => c === 'option' || c === 'options');
    // next line should be separator for a real table
    const next = lines[i + 1]?.trim() ?? '';
    if (!/^\|?\s*:?-{3,}/.test(next)) continue;
    if (!hasExplicitFlagCol) {
      if (!hasOptionCol) continue;
      // "Option(s)" headers: only count when the Option *cell* itself is a
      // CLI flag (avoids design A/B/C tables that mention `--file` in prose).
      const optionIdx = lower.findIndex(c => c === 'option' || c === 'options');
      let sawCliFlag = false;
      for (let j = i + 2; j < Math.min(lines.length, i + 12); j++) {
        const row = lines[j]!.trim();
        if (!row.startsWith('|')) break;
        const rowCells = row
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(c => c.trim());
        const cell = (rowCells[optionIdx] ?? '').replace(/[*_`]/g, '').trim();
        // short cell that is / starts with a CLI flag
        if (cell.length <= 48 && /^(?:-[a-z0-9]|--[a-z0-9][-a-z0-9]*)(?:\s|,|$)/i.test(cell)) {
          sawCliFlag = true;
          break;
        }
      }
      if (!sawCliFlag) continue;
    }
    hits.push({ line: i + 1, headers: cells });
  }
  return hits;
}

export function classifyMarkdownFile(
  file: string,
  text: string,
  registeredDocs: ReadonlySet<string>
): MdRefIdAuditRow {
  const anchors = extractHtmlAnchors(text, file).filter(
    a => REF_SECTION_RE.test(a.id) || parseRefId(a.id) != null
  );
  const flagRows = extractFlagTableRows(text, file);
  const opTables = extractOperatorFlagTables(text);
  const toc = extractTocFragmentLinks(text).filter(t => {
    const frag = t.href.startsWith('#') ? t.href.slice(1) : t.href;
    return REF_SECTION_RE.test(frag) || parseRefId(frag) != null;
  });
  const registered = registeredDocs.has(file);
  const sampleAnchors = anchors.map(a => a.id).slice(0, 12);

  if (registered) {
    return {
      file,
      class: 'registered',
      action: 'keep-registered',
      numberedAnchors: anchors.length,
      refIdTableRows: flagRows.length,
      operatorFlagTables: opTables.length,
      numberedTocLinks: toc.length,
      sampleAnchors,
      note: 'In docs:refid registry — full check applies',
    };
  }

  if (flagRows.length > 0 && anchors.length > 0) {
    return {
      file,
      class: 'refid-complete',
      action: 'candidate-promote',
      numberedAnchors: anchors.length,
      refIdTableRows: flagRows.length,
      operatorFlagTables: opTables.length,
      numberedTocLinks: toc.length,
      sampleAnchors,
      note: 'Has REF:ID table + numbered anchors but not registered — consider refIdRegistry()',
    };
  }

  if (flagRows.length > 0) {
    return {
      file,
      class: 'refid-complete',
      action: 'candidate-promote',
      numberedAnchors: anchors.length,
      refIdTableRows: flagRows.length,
      operatorFlagTables: opTables.length,
      numberedTocLinks: toc.length,
      sampleAnchors,
      note: 'Has REF:ID table without enough anchors — fix then register',
    };
  }

  if (opTables.length > 0) {
    const design = file.startsWith('docs/design/');
    return {
      file,
      class: 'flags-table-only',
      action: design ? 'candidate-promote' : 'leave-as-is',
      numberedAnchors: anchors.length,
      refIdTableRows: 0,
      operatorFlagTables: opTables.length,
      numberedTocLinks: toc.length,
      sampleAnchors,
      note: design
        ? 'Operator Flags table without REF:ID — promote when tool emits flagDocRef rows'
        : 'Operator Flags table outside design/ — leave unless tool↔doc coupling is required',
    };
  }

  if (anchors.length > 0) {
    return {
      file,
      class: 'numbered-anchors-only',
      action: 'leave-as-is',
      numberedAnchors: anchors.length,
      refIdTableRows: 0,
      operatorFlagTables: 0,
      numberedTocLinks: toc.length,
      sampleAnchors,
      note: 'Numbered anchors without Flags REF:ID table — review if intentional',
    };
  }

  return {
    file,
    class: 'clean',
    action: 'not-needed',
    numberedAnchors: 0,
    refIdTableRows: 0,
    operatorFlagTables: 0,
    numberedTocLinks: toc.length,
    sampleAnchors: [],
    note: 'No REF:ID / operator Flags table patterns',
  };
}

export type RefIdAuditReport = {
  schema: 'factorywager/ref-id-audit/v1';
  scanned: number;
  rows: MdRefIdAuditRow[];
  summary: Record<MdRefIdClass, number>;
  /** Validation issues when dry-run / check was also executed */
  validationIssues?: RefIdIssue[];
  dryRun?: boolean;
};

export function summarizeAudit(rows: MdRefIdAuditRow[]): Record<MdRefIdClass, number> {
  const summary: Record<MdRefIdClass, number> = {
    registered: 0,
    'refid-complete': 0,
    'flags-table-only': 0,
    'numbered-anchors-only': 0,
    clean: 0,
  };
  for (const r of rows) summary[r.class]++;
  return summary;
}

export function printAuditReport(report: RefIdAuditReport): void {
  const interesting = report.rows.filter(r => r.class !== 'clean');
  console.info(
    `${report.dryRun ? '[dry-run] ' : ''}docs:refid audit — scanned ${report.scanned} markdown file(s)`
  );
  console.info(
    `  registered=${report.summary.registered} · refid-complete=${report.summary['refid-complete']} · flags-table-only=${report.summary['flags-table-only']} · numbered-only=${report.summary['numbered-anchors-only']} · clean=${report.summary.clean}`
  );
  console.info('');
  if (interesting.length === 0) {
    console.info('  (no REF:ID or Flags-table surfaces found outside clean set)');
    return;
  }
  for (const r of interesting.sort((a, b) => a.file.localeCompare(b.file))) {
    console.info(`→ ${r.file}`);
    console.info(
      `    class=${r.class}  action=${r.action}  anchors=${r.numberedAnchors}  refIdRows=${r.refIdTableRows}  flagTables=${r.operatorFlagTables}`
    );
    if (r.sampleAnchors.length) console.info(`    anchors: ${r.sampleAnchors.join(', ')}`);
    console.info(`    note: ${r.note}`);
  }
  console.info('');
}

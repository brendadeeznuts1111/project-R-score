#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * docs-refid-check.ts — REF:ID v2 validation + suggest + href fill.
 *
 * Registered docs (baseline PR #501):
 *   docs/design/bun-types-inventory.md  ↔  tools/bun-types-status.ts flags
 *
 * Usage:
 *   bun tools/docs-refid-check.ts
 *   bun tools/docs-refid-check.ts --strict-format
 *   bun tools/docs-refid-check.ts --json
 *   bun tools/docs-refid-check.ts --skip-refid-check
 *   bun tools/docs-refid-check.ts --write-hrefs
 *   bun tools/docs-refid-check.ts suggest --section=4.1 --keyword=dry-run
 *
 * Package: `bun run docs:refid:check` · `docs:refid:suggest`
 * Also wired into `docs:map:check` (unless --skip-refid-check).
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  buildSuggestRefIdResult,
  checkRefIdDocument,
  collectTakenRefIds,
  fillEmptyHrefCells,
  scanMarkdownRefIds,
  type RefIdIssue,
  type ToolFlagRef,
} from '../lib/docs/ref-id.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  BUN_TYPES_INVENTORY_DOC,
  FLAGS_DOC_SECTION_REF,
  buildStatusFlagRows,
  defaultStatusCli,
} from './bun-types-status.ts';

const REPO = resolvePath(import.meta.dir, '..');

export type RefIdRegistryEntry = {
  /** Repo-relative markdown path */
  doc: string;
  /** Tooling flags that must resolve into the doc */
  toolFlags: () => ToolFlagRef[];
  requireToolCoverage?: boolean;
  sectionRefId?: string;
  sectionHeading?: string;
};

/** Documents that participate in REF:ID v2 checks. */
export function refIdRegistry(): RefIdRegistryEntry[] {
  return [
    {
      doc: BUN_TYPES_INVENTORY_DOC,
      requireToolCoverage: true,
      sectionRefId: FLAGS_DOC_SECTION_REF,
      sectionHeading: '### Flags / settings',
      toolFlags: () => {
        const rows = buildStatusFlagRows(defaultStatusCli());
        return rows.map((r): ToolFlagRef => ({
          refId: r.refId,
          href: r.href,
          source: 'tools/bun-types-status.ts',
        }));
      },
    },
  ];
}

export async function runRefIdChecks(opts: {
  strictFormat?: boolean;
  skip?: boolean;
}): Promise<RefIdIssue[]> {
  if (opts.skip) return [];
  const issues: RefIdIssue[] = [];
  for (const entry of refIdRegistry()) {
    const abs = joinPath(REPO, entry.doc);
    if (!(await Bun.file(abs).exists())) {
      issues.push({
        severity: 'error',
        kind: 'missing-anchor',
        file: entry.doc,
        detail: `registered REF:ID doc missing: ${entry.doc}`,
      });
      continue;
    }
    const text = await Bun.file(abs).text();
    issues.push(
      ...checkRefIdDocument(text, entry.doc, {
        strictFormat: opts.strictFormat === true,
        toolFlags: entry.toolFlags(),
        requireToolCoverage: entry.requireToolCoverage === true,
        sectionRefId: entry.sectionRefId,
        sectionHeading: entry.sectionHeading,
      })
    );
  }
  return issues;
}

export function printRefIdIssues(issues: RefIdIssue[]): void {
  if (issues.length === 0) {
    console.info('✅ docs:refid:check — REF:ID v2 ok (anchors · href · uniqueness)');
    return;
  }
  const errors = issues.filter(i => i.severity === 'error');
  const warns = issues.filter(i => i.severity === 'warn');
  console.info(
    `\n${errors.length ? '❌' : '⚠️'} docs:refid:check — ${errors.length} error(s) · ${warns.length} warn(s)\n`
  );
  for (const i of issues) {
    const loc = i.line != null ? `${i.file}:${i.line}` : i.file;
    const mark = i.severity === 'error' ? 'error' : 'warn';
    console.info(`→ ${loc}: [${mark}/${i.kind}] ${i.detail}`);
  }
  console.info('');
}

export async function suggestFromRegistry(opts: {
  section: string;
  keyword: string;
  doc?: string;
}): Promise<ReturnType<typeof buildSuggestRefIdResult>> {
  const entries = refIdRegistry();
  const entry = (opts.doc ? entries.find(e => e.doc === opts.doc) : undefined) ?? entries[0];
  if (!entry) {
    return buildSuggestRefIdResult(opts.section, opts.keyword, new Set());
  }
  const abs = joinPath(REPO, entry.doc);
  const text = (await Bun.file(abs).exists()) ? await Bun.file(abs).text() : '';
  const scan = scanMarkdownRefIds(text, entry.doc);
  const taken = collectTakenRefIds(scan, entry.toolFlags());
  return buildSuggestRefIdResult(opts.section, opts.keyword, taken);
}

export async function writeEmptyHrefs(): Promise<{
  files: Array<{ doc: string; filled: number }>;
}> {
  const files: Array<{ doc: string; filled: number }> = [];
  for (const entry of refIdRegistry()) {
    const abs = joinPath(REPO, entry.doc);
    if (!(await Bun.file(abs).exists())) continue;
    const before = await Bun.file(abs).text();
    const { text, filled } = fillEmptyHrefCells(before);
    if (filled > 0) {
      await Bun.write(abs, text.endsWith('\n') ? text : `${text}\n`);
    }
    files.push({ doc: entry.doc, filled });
  }
  return { files };
}

function parseKv(argv: string[], key: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${key}=`));
  if (eq) return eq.slice(key.length + 1);
  const i = argv.indexOf(key);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('-')) return argv[i + 1];
  return undefined;
}

async function runSuggest(argv: string[]): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`docs:refid:suggest — next available REF:ID under a section

  bun run docs:refid:suggest --section=4.1 --keyword=dry-run
  bun tools/docs-refid-check.ts suggest --section=4.1 --keyword=refresh
`);
    return;
  }
  const section = parseKv(argv, '--section');
  const keyword = parseKv(argv, '--keyword');
  if (!section || !keyword) {
    console.error('usage: docs:refid:suggest --section=4.1 --keyword=dry-run');
    process.exitCode = 1;
    return;
  }
  const result = await suggestFromRegistry({ section, keyword });
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  console.info(`REF:ID   ${result.refId}${result.taken ? '  (base was taken)' : ''}`);
  console.info(`href     ${result.href}`);
  console.info('');
  console.info('Paste:');
  console.info(`  ${result.paste.comment}`);
  console.info(`  ${result.paste.anchor}`);
  console.info(`  ${result.paste.tableCells}`);
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  if (argv[0] === 'suggest') {
    await runSuggest(argv.slice(1));
    return;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`docs-refid-check — REF:ID v2 validation

  bun tools/docs-refid-check.ts
  bun tools/docs-refid-check.ts --strict-format
  bun tools/docs-refid-check.ts --json
  bun tools/docs-refid-check.ts --skip-refid-check
  bun tools/docs-refid-check.ts --write-hrefs
  bun tools/docs-refid-check.ts suggest --section=4.1 --keyword=dry-run
`);
    return;
  }
  if (argv.includes('--write-hrefs')) {
    const { files } = await writeEmptyHrefs();
    for (const f of files) {
      console.info(`write-hrefs  ${f.doc}  filled=${f.filled}`);
    }
  }
  const skip = argv.includes('--skip-refid-check');
  const strictFormat = argv.includes('--strict-format') || argv.includes('--refid-strict');
  const asJson = argv.includes('--json');
  const issues = await runRefIdChecks({ skip, strictFormat });
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ schema: 'factorywager/ref-id/v2', count: issues.length, issues }, null, 2)}\n`
    );
  } else if (!skip) {
    printRefIdIssues(issues);
  }
  if (issues.some(i => i.severity === 'error')) process.exitCode = 1;
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}

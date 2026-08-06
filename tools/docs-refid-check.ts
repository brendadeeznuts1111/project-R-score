#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * docs-refid-check.ts — REF:ID v2 validation for design-doc flags / TOC / anchors.
 *
 * Registered docs (baseline PR #501):
 *   docs/design/bun-types-inventory.md  ↔  tools/bun-types-status.ts flags
 *
 * Usage:
 *   bun tools/docs-refid-check.ts
 *   bun tools/docs-refid-check.ts --strict-format
 *   bun tools/docs-refid-check.ts --json
 *   bun tools/docs-refid-check.ts --skip-refid-check   # no-op exit 0 (fast-pass)
 *
 * Package: `bun run docs:refid:check` · also wired into `docs:map:check` (unless --skip-refid-check).
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { checkRefIdDocument, type RefIdIssue, type ToolFlagRef } from '../lib/docs/ref-id.ts';
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

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`docs-refid-check — REF:ID v2 validation

  bun tools/docs-refid-check.ts
  bun tools/docs-refid-check.ts --strict-format
  bun tools/docs-refid-check.ts --json
  bun tools/docs-refid-check.ts --skip-refid-check
`);
    return;
  }
  const skip = argv.includes('--skip-refid-check');
  const strictFormat = argv.includes('--strict-format') || argv.includes('--refid-strict');
  const asJson = argv.includes('--json');
  const issues = await runRefIdChecks({ skip, strictFormat });
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ schema: 'factorywager/ref-id/v2', count: issues.length, issues }, null, 2)}\n`
    );
  } else {
    printRefIdIssues(issues);
  }
  if (issues.some(i => i.severity === 'error')) process.exitCode = 1;
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}

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
import {
  checkRefIdDocument,
  fillAutoHrefsInMarkdown,
  type RefIdIssue,
  type ToolFlagRef,
} from '../lib/docs/ref-id.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import { PARTNER_DOCUMENTATION_REFS } from '../lib/docs/partner-surface-inventory.ts';
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
  sectionRefId?: string; // brand-ok — design-doc section fragment (REF:ID), not domain brand
  sectionHeading?: string;
};

/** Documents that participate in REF:ID v2 checks. */
export function refIdRegistry(): RefIdRegistryEntry[] {
  /** Docs with operator Flags tables converted to REF:ID (no tool flagDocRef yet). */
  const docOnly = (doc: string): RefIdRegistryEntry => ({
    doc,
    requireToolCoverage: false,
    toolFlags: () => [],
  });
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
    docOnly('docs/IMAGES.md'),
    docOnly('docs/harness/tenants/complexity-floor.md'),
    docOnly('docs/harness/tenants/monorepo-workspaces.md'),
    docOnly('docs/harness/tenants/ops-snapshot.md'),
    ...PARTNER_DOCUMENTATION_REFS.map(ref => docOnly(ref.path)),
  ];
}

export async function runRefIdChecks(opts: {
  strictFormat?: boolean;
  skip?: boolean;
  /**
   * When set, validate only this repo-relative markdown path.
   * Uses registry opts (tool coverage / placement) when the path is registered;
   * otherwise validates the file alone (no tool coverage).
   */
  doc?: string;
  /** Override / set placement section id for ad-hoc `--doc` checks. */
  sectionRefId?: string; // brand-ok — design-doc section fragment (REF:ID), not domain brand
  sectionHeading?: string;
}): Promise<RefIdIssue[]> {
  if (opts.skip) return [];
  const issues: RefIdIssue[] = [];
  const entries = opts.doc
    ? (() => {
        const registered = refIdRegistry().find(e => e.doc === opts.doc);
        if (registered) return [registered];
        return [
          {
            doc: opts.doc!,
            toolFlags: () => [],
            requireToolCoverage: false,
            sectionRefId: opts.sectionRefId,
            sectionHeading: opts.sectionHeading,
          } satisfies RefIdRegistryEntry,
        ];
      })()
    : refIdRegistry();

  for (const entry of entries) {
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
        sectionRefId: opts.sectionRefId ?? entry.sectionRefId,
        sectionHeading: opts.sectionHeading ?? entry.sectionHeading,
      })
    );
  }
  return issues;
}

/** Fill auto href cells in registry docs (or a single `--doc`) and write back. */
export async function writeAutoHrefs(opts: {
  doc?: string;
}): Promise<Array<{ file: string; filled: number }>> {
  const entries = opts.doc ? [{ doc: opts.doc }] : refIdRegistry().map(e => ({ doc: e.doc }));
  const out: Array<{ file: string; filled: number }> = [];
  for (const entry of entries) {
    const abs = joinPath(REPO, entry.doc);
    if (!(await Bun.file(abs).exists())) continue;
    const before = await Bun.file(abs).text();
    const { text, filled } = fillAutoHrefsInMarkdown(before);
    if (filled > 0) {
      await Bun.write(abs, text.endsWith('\n') ? text : `${text}\n`);
    }
    out.push({ file: entry.doc, filled });
  }
  return out;
}

export function printRefIdIssues(issues: RefIdIssue[], opts: { dryRun?: boolean } = {}): void {
  const dry = opts.dryRun === true;
  const prefix = dry ? '[dry-run] ' : '';
  if (issues.length === 0) {
    console.info(`✅ ${prefix}docs:refid:check — REF:ID v2 ok (anchors · href · uniqueness)`);
    return;
  }
  const errors = issues.filter(i => i.severity === 'error');
  const warns = issues.filter(i => i.severity === 'warn');
  console.info(
    `\n${errors.length && !dry ? '❌' : '⚠️'} ${prefix}docs:refid:check — ${errors.length} error(s) · ${warns.length} warn(s)${dry ? ' (exit 0)' : ''}\n`
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
    console.log(`docs-refid-check — REF:ID v2 validation only (thin entry)

USAGE
  bun tools/docs-refid-check.ts [options]
  bun run docs:refid:check

Prefer the multi-command CLI for DX:
  bun tools/docs-refid.ts help
  bun run docs:refid:suggest | :list | :scaffold

OPTIONS
  --strict-format · --refid-strict   Format warns become errors
  --dry-run                          Report issues + always exit 0
  --skip-refid-check                 Exit 0 without validating
  --write-hrefs                      Fill empty/—/auto href cells from REF:ID
  --doc=<path>                       Check one markdown file (registry opts if registered)
  --json                             Machine-readable issues array
  -h · --help                        This help

DEFAULTS
  mode     soft (format length/kebab → warn; missing anchors/href → error)
  registry ${BUN_TYPES_INVENTORY_DOC} ↔ bun:types-status flags

SEE ALSO
  tools/docs-refid.ts · lib/docs/ref-id.ts
  docs/contributing/CONTRIBUTING.md § REF:ID Validation
`);
    return;
  }
  const skip = argv.includes('--skip-refid-check');
  const strictFormat = argv.includes('--strict-format') || argv.includes('--refid-strict');
  const asJson = argv.includes('--json');
  const writeHrefs = argv.includes('--write-hrefs');
  const docEq = argv.find(a => a.startsWith('--doc='));
  const doc = docEq ? docEq.slice('--doc='.length) || undefined : undefined;
  const sectionRefEq = argv.find(a => a.startsWith('--section-ref='));
  const sectionHeadingEq = argv.find(a => a.startsWith('--section-heading='));
  const sectionRefId = sectionRefEq
    ? sectionRefEq.slice('--section-ref='.length) || undefined
    : undefined;
  const sectionHeading = sectionHeadingEq
    ? sectionHeadingEq.slice('--section-heading='.length) || undefined
    : undefined;
  if (writeHrefs && !skip) {
    const written = await writeAutoHrefs({ doc });
    for (const w of written) {
      if (w.filled > 0) console.info(`✏️  wrote ${w.filled} href cell(s) in ${w.file}`);
    }
  }
  const issues = await runRefIdChecks({ skip, strictFormat, doc, sectionRefId, sectionHeading });
  const dryRun = argv.includes('--dry-run');
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ schema: 'factorywager/ref-id/v2', count: issues.length, issues, dryRun }, null, 2)}\n`
    );
  } else {
    printRefIdIssues(issues, { dryRun });
  }
  if (!dryRun && issues.some(i => i.severity === 'error')) process.exitCode = 1;
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}

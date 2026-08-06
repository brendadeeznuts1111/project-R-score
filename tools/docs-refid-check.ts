#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * docs-refid-check.ts — REF:ID v2 validation for design-doc flags / TOC / anchors.
 *
 * Coverage planes: design · domain · portal · harness · lib (+ discovery scan).
 * Hard registry (flags): bun-types-inventory + lib/docs/ref-id-tool-flags.ts.
 * Partner authority docs: PARTNER_DOCUMENTATION_REFS (plane by path).
 *
 * Usage:
 *   bun tools/docs-refid-check.ts
 *   bun tools/docs-refid-check.ts --strict-format
 *   bun tools/docs-refid-check.ts --registry-only
 *   bun tools/docs-refid-check.ts --dry-run
 *   bun tools/docs-refid-check.ts --json
 *   bun tools/docs-refid-check.ts --skip-refid-check   # no-op exit 0 (fast-pass)
 *
 * Package: `bun run docs:refid:check` · also wired into `docs:map:check` (unless --skip-refid-check).
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  checkRefIdDocument,
  fillAutoHrefsInMarkdown,
  parseRefId,
  scanMarkdownRefIds,
  type RefIdDocScan,
  type RefIdIssue,
  type ToolFlagRef,
} from '../lib/docs/ref-id.ts';
import {
  COMPLEXITY_FLOOR_DOC,
  IMAGES_GENERATE_DOC,
  LINT_WIRES_DOC,
  MONOREPO_FILTER_DOC,
  OPS_SNAPSHOT_DOC,
  PARTNER_ONBOARD_DOC,
  TELEGRAM_OPS_DOC,
  complexityFloorToolFlags,
  imagesGenerateToolFlags,
  lintWiresToolFlags,
  monorepoFilterToolFlags,
  opsSnapshotToolFlags,
  partnerOnboardToolFlags,
  telegramOpsToolFlags,
} from '../lib/docs/ref-id-tool-flags.ts';
import { PARTNER_DOCUMENTATION_REFS } from '../lib/docs/partner-surface-inventory.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  BUN_TYPES_INVENTORY_DOC,
  FLAGS_DOC_SECTION_REF,
  buildStatusFlagRows,
  defaultStatusCli,
} from './bun-types-status.ts';

const REPO = resolvePath(import.meta.dir, '..');

/** Coverage planes for registry rows + help / JSON. */
export const REF_ID_PLANES = ['design', 'domain', 'portal', 'harness', 'lib'] as const;
export type RefIdPlane = (typeof REF_ID_PLANES)[number];

/** Issue / scan plane includes project discovery. */
export type RefIdCoveragePlane = RefIdPlane | 'discovery';

export type RefIdRegistryRole = 'flags' | 'guide' | 'discovery';

export type RefIdRegistryEntry = {
  /** Repo-relative path (markdown unless `markdown: false`) */
  doc: string;
  plane: RefIdPlane;
  role: RefIdRegistryRole;
  /** Tooling flags that must resolve into the doc */
  toolFlags: () => ToolFlagRef[];
  requireToolCoverage?: boolean;
  sectionRefId?: string; // brand-ok — design-doc section fragment (REF:ID), not domain brand
  sectionHeading?: string;
  /**
   * When false, entry is help/JSON guidance only (e.g. lib/docs/ref-id.ts).
   * Default true for markdown paths.
   */
  markdown?: boolean;
};

export type RefIdPlaneStats = {
  registryDocs: number;
  scannedDocs: number;
  issueCount: number;
};

export type RefIdCheckReport = {
  issues: RefIdIssue[];
  planes: Record<RefIdCoveragePlane, RefIdPlaneStats>;
  registry: Array<{
    doc: string;
    plane: RefIdPlane;
    role: RefIdRegistryRole;
    requireToolCoverage: boolean;
    markdown: boolean;
  }>;
  /** Discovery files actually validated (excluding hard-registry paths). */
  scanned: number;
};

const DISCOVERY_GLOBS = ['docs/**/*.md', 'public/portal/**/*.md'] as const;

const EMPTY_PLANE_STATS = (): RefIdPlaneStats => ({
  registryDocs: 0,
  scannedDocs: 0,
  issueCount: 0,
});

function emptyPlanes(): Record<RefIdCoveragePlane, RefIdPlaneStats> {
  return {
    design: EMPTY_PLANE_STATS(),
    domain: EMPTY_PLANE_STATS(),
    portal: EMPTY_PLANE_STATS(),
    harness: EMPTY_PLANE_STATS(),
    lib: EMPTY_PLANE_STATS(),
    discovery: EMPTY_PLANE_STATS(),
  };
}

/** Infer coverage plane from repo-relative path. */
export function planeForPath(doc: string): RefIdPlane {
  const p = doc.replace(/\\/g, '/');
  if (p.startsWith('docs/DOMAIN') || p.includes('/domain-')) return 'domain';
  if (p.startsWith('docs/portal') || p.startsWith('public/portal/')) return 'portal';
  if (p.startsWith('docs/harness/')) return 'harness';
  if (p.startsWith('lib/')) return 'lib';
  return 'design';
}

/** True when scan found real REF:ID markup (not prose mentions). */
export function hasRefIdMarkup(scan: RefIdDocScan): boolean {
  return (
    scan.flagRows.length > 0 ||
    scan.commentRefs.length > 0 ||
    scan.anchors.some(a => parseRefId(a.id) != null)
  );
}

/**
 * Documents that participate in REF:ID v2 checks / coverage planes.
 * Flag-table owners use requireToolCoverage + lib/docs/ref-id-tool-flags.ts.
 * Partner documentation register paths (PARTNER_DOCUMENTATION_REFS) not already
 * covered stay guides until their tool rows are wired.
 */
export function refIdRegistry(): RefIdRegistryEntry[] {
  const guide = (doc: string, plane?: RefIdPlane): RefIdRegistryEntry => ({
    doc,
    plane: plane ?? planeForPath(doc),
    role: 'guide',
    requireToolCoverage: false,
    toolFlags: () => [],
    markdown: doc.endsWith('.md'),
  });

  const flags = (
    entry: Omit<RefIdRegistryEntry, 'plane' | 'role' | 'markdown'> & {
      plane?: RefIdPlane;
    }
  ): RefIdRegistryEntry => ({
    ...entry,
    plane: entry.plane ?? planeForPath(entry.doc),
    role: 'flags',
    markdown: true,
  });

  const primary: RefIdRegistryEntry[] = [
    flags({
      doc: BUN_TYPES_INVENTORY_DOC,
      plane: 'design',
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
    }),
    flags({
      doc: LINT_WIRES_DOC,
      requireToolCoverage: true,
      toolFlags: lintWiresToolFlags,
    }),
    flags({
      doc: PARTNER_ONBOARD_DOC,
      requireToolCoverage: true,
      toolFlags: partnerOnboardToolFlags,
    }),
    flags({
      doc: IMAGES_GENERATE_DOC,
      requireToolCoverage: true,
      toolFlags: imagesGenerateToolFlags,
    }),
    flags({
      doc: COMPLEXITY_FLOOR_DOC,
      requireToolCoverage: true,
      toolFlags: complexityFloorToolFlags,
    }),
    flags({
      doc: MONOREPO_FILTER_DOC,
      requireToolCoverage: true,
      toolFlags: monorepoFilterToolFlags,
    }),
    flags({
      doc: OPS_SNAPSHOT_DOC,
      requireToolCoverage: true,
      toolFlags: opsSnapshotToolFlags,
    }),
    flags({
      doc: TELEGRAM_OPS_DOC,
      requireToolCoverage: true,
      toolFlags: telegramOpsToolFlags,
    }),
  ];

  const covered = new Set(primary.map(e => e.doc));
  const partnerRest = PARTNER_DOCUMENTATION_REFS.map(ref => ref.path)
    .filter(path => !covered.has(path))
    .map(path => guide(path));

  for (const e of partnerRest) covered.add(e.doc);
  const planeGuides: RefIdRegistryEntry[] = [
    guide('docs/DOMAIN_CONCEPT_SHAPE.md', 'domain'),
    guide('docs/portal-foundation.md', 'portal'),
    guide('docs/harness/AUTHORITY.md', 'harness'),
    {
      doc: 'lib/docs/ref-id.ts',
      plane: 'lib',
      role: 'guide',
      markdown: false,
      toolFlags: () => [],
    },
  ].filter(e => !covered.has(e.doc));

  return [...primary, ...partnerRest, ...planeGuides];
}

function withPlane(issues: RefIdIssue[], plane: RefIdCoveragePlane): RefIdIssue[] {
  return issues.map(i => ({ ...i, plane: i.plane ?? plane }));
}

async function checkRegistryEntry(
  entry: RefIdRegistryEntry,
  opts: {
    strictFormat?: boolean;
    sectionRefId?: string;
    sectionHeading?: string;
  }
): Promise<RefIdIssue[]> {
  if (entry.markdown === false) return [];
  const abs = joinPath(REPO, entry.doc);
  if (!(await Bun.file(abs).exists())) {
    return [
      {
        severity: 'error',
        kind: 'missing-anchor',
        file: entry.doc,
        plane: entry.plane,
        detail: `registered REF:ID doc missing: ${entry.doc}`,
      },
    ];
  }
  const text = await Bun.file(abs).text();
  // Guide rows: only validate when they already carry REF:ID markup.
  if (entry.role === 'guide') {
    const scan = scanMarkdownRefIds(text, entry.doc);
    if (!hasRefIdMarkup(scan)) return [];
  }
  return withPlane(
    checkRefIdDocument(text, entry.doc, {
      strictFormat: opts.strictFormat === true,
      toolFlags: entry.toolFlags(),
      requireToolCoverage: entry.requireToolCoverage === true,
      sectionRefId: opts.sectionRefId ?? entry.sectionRefId,
      sectionHeading: opts.sectionHeading ?? entry.sectionHeading,
    }),
    entry.plane
  );
}

async function discoverRefIdMarkdown(skip: Set<string>): Promise<string[]> {
  const found = new Set<string>();
  for (const pattern of DISCOVERY_GLOBS) {
    const glob = new Bun.Glob(pattern);
    for await (const rel of glob.scan({ cwd: REPO, onlyFiles: true })) {
      const norm = String(rel).replace(/\\/g, '/');
      if (skip.has(norm) || found.has(norm)) continue;
      const abs = joinPath(REPO, norm);
      if (!(await Bun.file(abs).exists())) continue;
      const text = await Bun.file(abs).text();
      if (!hasRefIdMarkup(scanMarkdownRefIds(text, norm))) continue;
      found.add(norm);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

export async function runRefIdCheckReport(opts: {
  strictFormat?: boolean;
  skip?: boolean;
  /**
   * When set, validate only this repo-relative markdown path.
   * Uses registry opts (tool coverage / placement) when the path is registered;
   * otherwise validates the file alone (no tool coverage). Skips discovery.
   */
  doc?: string;
  /** Override / set placement section id for ad-hoc `--doc` checks. */
  sectionRefId?: string; // brand-ok — design-doc section fragment (REF:ID), not domain brand
  sectionHeading?: string;
  /** Skip project discovery globs (hard + guide registry only). */
  registryOnly?: boolean;
}): Promise<RefIdCheckReport> {
  const registryMeta = refIdRegistry().map(e => ({
    doc: e.doc,
    plane: e.plane,
    role: e.role,
    requireToolCoverage: e.requireToolCoverage === true,
    markdown: e.markdown !== false,
  }));
  const planes = emptyPlanes();
  for (const e of registryMeta) {
    planes[e.plane].registryDocs += 1;
  }

  if (opts.skip) {
    return { issues: [], planes, registry: registryMeta, scanned: 0 };
  }

  const issues: RefIdIssue[] = [];

  if (opts.doc) {
    const registered = refIdRegistry().find(e => e.doc === opts.doc);
    const entry: RefIdRegistryEntry = registered ?? {
      doc: opts.doc,
      plane: planeForPath(opts.doc),
      role: 'discovery',
      toolFlags: () => [],
      requireToolCoverage: false,
      sectionRefId: opts.sectionRefId,
      sectionHeading: opts.sectionHeading,
    };
    const entryIssues = await checkRegistryEntry(entry, opts);
    issues.push(...entryIssues);
    const plane: RefIdCoveragePlane = registered?.plane ?? 'discovery';
    planes[plane].scannedDocs += 1;
    planes[plane].issueCount += entryIssues.length;
    return { issues, planes, registry: registryMeta, scanned: registered ? 0 : 1 };
  }

  for (const entry of refIdRegistry()) {
    const entryIssues = await checkRegistryEntry(entry, opts);
    issues.push(...entryIssues);
    if (entry.markdown !== false && entry.role === 'flags') {
      planes[entry.plane].scannedDocs += 1;
    } else if (entry.markdown !== false && entry.role === 'guide') {
      const abs = joinPath(REPO, entry.doc);
      if (await Bun.file(abs).exists()) {
        const text = await Bun.file(abs).text();
        if (hasRefIdMarkup(scanMarkdownRefIds(text, entry.doc))) {
          planes[entry.plane].scannedDocs += 1;
        }
      }
    }
    planes[entry.plane].issueCount += entryIssues.length;
  }

  let scanned = 0;
  if (!opts.registryOnly) {
    const skip = new Set(
      refIdRegistry()
        .filter(e => e.markdown !== false)
        .map(e => e.doc)
    );
    const discovered = await discoverRefIdMarkdown(skip);
    for (const doc of discovered) {
      const abs = joinPath(REPO, doc);
      const text = await Bun.file(abs).text();
      const docIssues = withPlane(
        checkRefIdDocument(text, doc, {
          strictFormat: opts.strictFormat === true,
          toolFlags: [],
          requireToolCoverage: false,
        }),
        'discovery'
      );
      issues.push(...docIssues);
      scanned += 1;
      planes.discovery.scannedDocs += 1;
      planes.discovery.issueCount += docIssues.length;
    }
  }

  return { issues, planes, registry: registryMeta, scanned };
}

export async function runRefIdChecks(opts: {
  strictFormat?: boolean;
  skip?: boolean;
  doc?: string;
  sectionRefId?: string;
  sectionHeading?: string;
  registryOnly?: boolean;
}): Promise<RefIdIssue[]> {
  const report = await runRefIdCheckReport(opts);
  return report.issues;
}

/** Fill auto href cells in markdown registry docs (or a single `--doc`) and write back. */
export async function writeAutoHrefs(opts: {
  doc?: string;
}): Promise<Array<{ file: string; filled: number }>> {
  const entries = opts.doc
    ? [{ doc: opts.doc }]
    : refIdRegistry()
        .filter(e => e.markdown !== false)
        .map(e => ({ doc: e.doc }));
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
    const plane = i.plane ? ` plane=${i.plane}` : '';
    console.info(`→ ${loc}: [${mark}/${i.kind}${plane}] ${i.detail}`);
  }
  console.info('');
}

function printThinHelp(): void {
  console.log(`docs-refid-check — REF:ID v2 validation only (thin entry)

USAGE
  bun tools/docs-refid-check.ts [options]
  bun run docs:refid:check

Prefer the multi-command CLI for DX:
  bun tools/docs-refid.ts help
  bun run docs:refid:suggest | :list | :scaffold | :audit

OPTIONS
  --strict-format · --refid-strict   Format warns become errors
  --dry-run                          Report issues + always exit 0
  --skip-refid-check                 Exit 0 without validating
  --registry-only                    Skip project discovery globs
  --write-hrefs                      Fill empty/—/auto href cells from REF:ID
  --doc=<path>                       Check one markdown file (registry opts if registered)
  --json                             Machine-readable report (issues · planes · registry)
  -h · --help                        This help

DEFAULTS
  mode     soft (format length/kebab → warn; missing anchors/href → error)
  check    hard registry + project discovery (docs/** · public/portal/**)
  registry ${BUN_TYPES_INVENTORY_DOC} ↔ bun:types-status flags (plane=design)
           + lib/docs/ref-id-tool-flags.ts flag owners

COVERAGE PLANES
  design   inventory + partner surface / onboard / IMAGES (flags) + partner guides
  domain   docs/DOMAIN_CONCEPT_SHAPE.md (guide)
  portal   docs/portal-foundation.md (guide)
  harness  AUTHORITY + tenant flag docs (ops-snapshot · monorepo · complexity · handshake)
  lib      lib/docs/ref-id.ts (guide · not markdown-scanned)

PROJECT SCAN
  globs    docs/**/*.md · public/portal/**/*.md
  when     file has REF:ID markup (flag table · <!-- REF:ID --> · numbered <a id>)
  skip     --registry-only · --doc=<path> · --skip-refid-check

SEE ALSO
  tools/docs-refid.ts · lib/docs/ref-id.ts · lib/docs/ref-id-tool-flags.ts
  docs/DOMAIN_CONCEPT_SHAPE.md · docs/portal-foundation.md
  docs/contributing/CONTRIBUTING.md § REF:ID Validation
`);
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printThinHelp();
    return;
  }
  const skip = argv.includes('--skip-refid-check');
  const strictFormat = argv.includes('--strict-format') || argv.includes('--refid-strict');
  const asJson = argv.includes('--json');
  const writeHrefs = argv.includes('--write-hrefs');
  const registryOnly = argv.includes('--registry-only');
  const dryRun = argv.includes('--dry-run');
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
  const report = await runRefIdCheckReport({
    skip,
    strictFormat,
    doc,
    sectionRefId,
    sectionHeading,
    registryOnly,
  });
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schema: 'factorywager/ref-id/v2',
          count: report.issues.length,
          issues: report.issues,
          planes: report.planes,
          registry: report.registry,
          scanned: report.scanned,
          dryRun,
        },
        null,
        2
      )}\n`
    );
  } else {
    printRefIdIssues(report.issues, { dryRun });
  }
  if (!dryRun && report.issues.some(i => i.severity === 'error')) process.exitCode = 1;
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}

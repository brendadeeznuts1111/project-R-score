#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * docs-refid.ts — REF:ID v2 multi-command CLI (check · audit · suggest · list · scaffold).
 *
 *   bun tools/docs-refid.ts check
 *   bun tools/docs-refid.ts check --strict-format
 *   bun tools/docs-refid.ts check --dry-run
 *   bun tools/docs-refid.ts audit
 *   bun tools/docs-refid.ts suggest --section=4.1 --keyword=refresh
 *   bun tools/docs-refid.ts suggest --section=4.1 --flag=--max-age-days
 *   bun tools/docs-refid.ts list [--doc=docs/design/bun-types-inventory.md]
 *   bun tools/docs-refid.ts scaffold --section=4.1 --flag=--foo-bar [--script=bun:types-status]
 *
 * Package aliases:
 *   bun run docs:refid:check · docs:refid:audit · docs:refid:suggest · docs:refid:list · docs:refid:scaffold
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  collectTakenRefIds,
  hrefFromRefId,
  normalizeRefIdKeyword,
  parseRefId,
  scaffoldFlagSnippet,
  scanMarkdownRefIds,
  suggestRefId,
  validateRefIdFormat,
} from '../lib/docs/ref-id.ts';
import {
  classifyMarkdownFile,
  printAuditReport,
  summarizeAudit,
  type MdRefIdAuditRow,
  type RefIdAuditReport,
} from '../lib/docs/ref-id-audit.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  printRefIdIssues,
  refIdRegistry,
  runRefIdChecks,
  writeAutoHrefs,
} from './docs-refid-check.ts';
import { BUN_TYPES_INVENTORY_DOC } from './bun-types-status.ts';

const REPO = resolvePath(import.meta.dir, '..');

function flagValue(argv: string[], name: string): string | null {
  const eq = argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1) || null;
  const idx = argv.indexOf(name);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1]!.startsWith('-')) return argv[idx + 1]!;
  return null;
}

function printHelp(): void {
  console.log(`docs-refid — REF:ID v2 validation & DX (check · audit · suggest · list · scaffold)

USAGE
  bun tools/docs-refid.ts <command> [options]
  bun run docs:refid[:check|:audit|:suggest|:list|:scaffold] …

COMMANDS
  check      Validate registered design docs + tool flag rows (default command)
  audit      Inventory markdown for REF:ID / Flags tables (design + docs/)
  suggest    Free REF:ID under a section (normalizes --flag / camelCase → kebab)
  list       Numbered REF:IDs / section anchors in a doc
  scaffold   Paste-ready <!-- REF:ID --> + <a id> + flags table row
  help       This message

OPTIONS
  --strict-format · --refid-strict   Format warns (length/kebab) become errors
  --dry-run                          check: report errors but always exit 0; also run audit inventory
  --skip-refid-check                 check: exit 0 without validating (fast-pass)
  --write-hrefs                      check: fill empty/—/auto href cells from REF:ID
  --json                             Machine output (check / audit / suggest / list / scaffold)
  --section=<path>                   Section number path (default: 4.1)
  --keyword=<leaf>                   Keyword leaf (kebab preferred)
  --flag=<--cli-flag>                CLI flag; normalized to keyword (e.g. --maxAgeDays)
  --doc=<path>                       Markdown doc (default: ${BUN_TYPES_INVENTORY_DOC})
                                     check: validate only this file (registry opts if registered)
  --section-ref=<id>                 check --doc: placement section id (e.g. 4.1)
  --section-heading=<md>             check --doc: exact Flags heading line
  --script=<name>                    scaffold package.json script (default: bun:types-status)
  --shortcode=<s>                    scaffold shortcode cell (default: —)
  --default=<s>                      scaffold default cell (default: off)
  --all                              list: include slug TOC ids; audit: include clean rows
  --roots=<a,b>                      audit scan roots (default: docs)
  -h · --help                        Show this help

DEFAULTS
  command     check
  --section   4.1
  --doc       ${BUN_TYPES_INVENTORY_DOC}
  --script    bun:types-status
  --default   off
  href        always derived as # + REF:ID (table may use empty / — / auto)

REGISTERED DOCS (check)
  ${BUN_TYPES_INVENTORY_DOC}
    ↔ tools/bun-types-status.ts flag rows (requireToolCoverage)
  ${refIdRegistry().length - 1} partner authority docs
    ↔ lib/docs/partner-surface-inventory.ts PARTNER_DOCUMENTATION_REFS

VALIDATION PRESETS
  soft (default)     format length/kebab → warn; errors fail process
  --strict-format    format issues → error
  --dry-run          validate + inventory; never fail (report only)
  --skip-refid-check skip validation entirely (exit 0)
  --write-hrefs      rewrite auto href cells, then validate

REF:ID RULES (summary)
  shape       {section}.{kebab-keyword}   e.g. 4.1.refresh · 4.1.max-age-days
  href        # + REF:ID
  keyword     2–32 chars · no leading/trailing - · no index|top|toc|anchor
  unique      per document (anchors + flags table)
  placement   section id on line immediately above Flags heading (when configured)

EXAMPLES
  bun tools/docs-refid.ts check
  bun tools/docs-refid.ts check --strict-format --json
  bun tools/docs-refid.ts check --dry-run
  bun tools/docs-refid.ts audit
  bun tools/docs-refid.ts check --doc=path/to/draft.md --write-hrefs
  bun tools/docs-refid.ts check --doc=draft.md --section-ref=4.1 \\
      --section-heading='### Flags / settings'
  bun tools/docs-refid.ts suggest --section=4.1 --flag=--foo-bar
  bun tools/docs-refid.ts suggest --section=4.1 --keyword=refresh   # → 4.1.refresh-2 if taken
  bun tools/docs-refid.ts list --doc=${BUN_TYPES_INVENTORY_DOC}
  bun tools/docs-refid.ts scaffold --section=4.1 --flag=--new-flag

SEE ALSO
  lib/docs/ref-id.ts · lib/docs/ref-id-audit.ts
  docs/DEVELOPMENT-STANDARDS.md § REF:ID
  docs/contributing/CONTRIBUTING.md § REF:ID Validation
  bun run docs:map:check          # includes REF:ID unless --skip-refid-check
`);
}

async function loadDocScan(docRel: string) {
  const abs = joinPath(REPO, docRel);
  if (!(await Bun.file(abs).exists())) {
    throw new Error(`doc not found: ${docRel}`);
  }
  const text = await Bun.file(abs).text();
  return { text, scan: scanMarkdownRefIds(text, docRel), docRel };
}

async function buildAuditReport(
  argv: string[],
  opts: { dryRun?: boolean } = {}
): Promise<RefIdAuditReport> {
  const rootsArg = flagValue(argv, '--roots');
  const roots = (rootsArg ? rootsArg.split(',') : ['docs']).map(r => r.trim()).filter(Boolean);
  const registered = new Set(refIdRegistry().map(e => e.doc));
  const showClean = argv.includes('--all');
  const rows: MdRefIdAuditRow[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    const absRoot = joinPath(REPO, root);
    const glob = new Bun.Glob('**/*.md');
    for await (const rel of glob.scan({ cwd: absRoot, onlyFiles: true })) {
      const file = joinPath(root, rel).replace(/\\/g, '/');
      if (seen.has(file)) continue;
      seen.add(file);
      const text = await Bun.file(joinPath(REPO, file)).text();
      const row = classifyMarkdownFile(file, text, registered);
      if (row.class === 'clean' && !showClean) continue;
      rows.push(row);
    }
  }
  // When not --all, still include registered even if somehow missed
  for (const doc of registered) {
    if (seen.has(doc)) continue;
    const abs = joinPath(REPO, doc);
    if (!(await Bun.file(abs).exists())) continue;
    const text = await Bun.file(abs).text();
    rows.push(classifyMarkdownFile(doc, text, registered));
  }
  rows.sort((a, b) => a.file.localeCompare(b.file));
  return {
    schema: 'factorywager/ref-id-audit/v1',
    scanned: seen.size || rows.length,
    rows: showClean ? rows : rows.filter(r => r.class !== 'clean'),
    summary: summarizeAudit(
      // summary over full scan including clean
      await (async () => {
        const full: MdRefIdAuditRow[] = [];
        const fullSeen = new Set<string>();
        for (const root of roots) {
          const absRoot = joinPath(REPO, root);
          const glob = new Bun.Glob('**/*.md');
          for await (const rel of glob.scan({ cwd: absRoot, onlyFiles: true })) {
            const file = joinPath(root, rel).replace(/\\/g, '/');
            if (fullSeen.has(file)) continue;
            fullSeen.add(file);
            const text = await Bun.file(joinPath(REPO, file)).text();
            full.push(classifyMarkdownFile(file, text, registered));
          }
        }
        return full;
      })()
    ),
    dryRun: opts.dryRun === true,
  };
}

async function cmdAudit(argv: string[]): Promise<void> {
  const report = await buildAuditReport(argv);
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  printAuditReport(report);
  const candidates = report.rows.filter(r => r.action === 'candidate-promote');
  if (candidates.length) {
    console.info('CANDIDATES (not registered — promote when tool flagDocRef exists):');
    for (const c of candidates) console.info(`  · ${c.file} — ${c.note}`);
    console.info('');
  }
  const leave = report.rows.filter(
    r => r.class === 'flags-table-only' && r.action === 'leave-as-is'
  );
  if (leave.length) {
    console.info('FLAGS TABLES (leave as-is — not design-doc REF:ID surface):');
    for (const c of leave) console.info(`  · ${c.file}`);
    console.info('');
  }
}

async function cmdCheck(argv: string[]): Promise<void> {
  const skip = argv.includes('--skip-refid-check');
  const dryRun = argv.includes('--dry-run');
  const strictFormat = argv.includes('--strict-format') || argv.includes('--refid-strict');
  const asJson = argv.includes('--json');
  const writeHrefs = argv.includes('--write-hrefs');
  const doc = flagValue(argv, '--doc') ?? undefined;
  const sectionRefId = flagValue(argv, '--section-ref') ?? undefined;
  const sectionHeading = flagValue(argv, '--section-heading') ?? undefined;
  if (writeHrefs && !skip) {
    const written = await writeAutoHrefs({ doc });
    for (const w of written) {
      if (w.filled > 0) console.info(`✏️  wrote ${w.filled} href cell(s) in ${w.file}`);
      else if (doc) console.info(`(no auto href cells to fill in ${w.file})`);
    }
  }
  const issues = await runRefIdChecks({
    skip,
    strictFormat,
    doc,
    sectionRefId,
    sectionHeading,
  });
  if (dryRun && !skip) {
    const audit = await buildAuditReport(argv, { dryRun: true });
    audit.validationIssues = issues;
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify(
          {
            schema: 'factorywager/ref-id/v2+audit',
            dryRun: true,
            count: issues.length,
            issues,
            audit,
          },
          null,
          2
        )}\n`
      );
    } else {
      printRefIdIssues(issues, { dryRun: true });
      printAuditReport(audit);
    }
    return;
  }
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        { schema: 'factorywager/ref-id/v2', count: issues.length, issues, dryRun: false },
        null,
        2
      )}\n`
    );
  } else {
    printRefIdIssues(issues, { dryRun: false });
  }
  if (issues.some(i => i.severity === 'error')) process.exitCode = 1;
}

async function cmdSuggest(argv: string[]): Promise<void> {
  const section = flagValue(argv, '--section') ?? '4.1';
  const keywordRaw =
    flagValue(argv, '--keyword') ?? flagValue(argv, '--flag') ?? flagValue(argv, '--leaf');
  if (!keywordRaw) {
    console.error('usage: docs-refid suggest --section=4.1 --keyword=leaf | --flag=--cli-flag');
    process.exitCode = 1;
    return;
  }
  const docRel = flagValue(argv, '--doc') ?? BUN_TYPES_INVENTORY_DOC;
  const { scan } = await loadDocScan(docRel);
  const taken = collectTakenRefIds(scan);
  for (const entry of refIdRegistry()) {
    if (entry.doc === docRel) {
      for (const t of entry.toolFlags()) taken.add(t.refId);
    }
  }
  const keyword = normalizeRefIdKeyword(keywordRaw);
  const refId = suggestRefId(section, keyword, taken);
  const href = hrefFromRefId(refId);
  const formats = validateRefIdFormat(refId);
  const payload = {
    section,
    keyword,
    keywordInput: keywordRaw,
    refId,
    href,
    taken: taken.has(refId),
    formatOk: formats.length === 0,
    formatIssues: formats,
    doc: docRel,
  };
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  console.info(`REF:ID suggest  (${docRel})`);
  console.info(`  section   ${section}`);
  console.info(`  keyword   ${keyword}${keyword !== keywordRaw ? `  (from ${keywordRaw})` : ''}`);
  console.info(`  REF:ID    ${refId}`);
  console.info(`  href      ${href}`);
  if (formats.length) {
    for (const f of formats) console.info(`  ! ${f.severity}/${f.kind}: ${f.detail}`);
  } else {
    console.info(`  status    free · format ok`);
  }
  console.info('');
  console.info('scaffold:');
  console.info(
    scaffoldFlagSnippet({
      section,
      keyword,
      flag: keywordRaw.startsWith('-') ? keywordRaw : `--${keyword}`,
    }).markdown
  );
}

async function cmdList(argv: string[]): Promise<void> {
  const docRel = flagValue(argv, '--doc') ?? BUN_TYPES_INVENTORY_DOC;
  const { scan } = await loadDocScan(docRel);
  const all = collectTakenRefIds(scan);
  const showAll = argv.includes('--all');
  const taken = [...all]
    .filter(id => showAll || parseRefId(id) != null || /^\d+(?:\.\d+)*$/.test(id))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const payload = {
    doc: docRel,
    count: taken.length,
    anchors: scan.anchors.map(a => ({ id: a.id, line: a.line })),
    flagRows: scan.flagRows.map(r => ({
      refId: r.refId,
      href: r.href || hrefFromRefId(r.refId),
      line: r.line,
    })),
    ids: taken,
  };
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  console.info(`REF:ID list  ${docRel}  (${taken.length}${showAll ? '' : ' numbered'})`);
  for (const id of taken) {
    const isFull = parseRefId(id) != null;
    const mark = isFull ? '·' : '§';
    console.info(`  ${mark} ${id}`);
  }
}

async function cmdScaffold(argv: string[]): Promise<void> {
  const section = flagValue(argv, '--section') ?? '4.1';
  const keywordRaw =
    flagValue(argv, '--keyword') ?? flagValue(argv, '--flag') ?? flagValue(argv, '--leaf');
  if (!keywordRaw) {
    console.error('usage: docs-refid scaffold --section=4.1 --flag=--foo-bar');
    process.exitCode = 1;
    return;
  }
  const docRel = flagValue(argv, '--doc') ?? BUN_TYPES_INVENTORY_DOC;
  let taken = new Set<string>();
  try {
    const { scan } = await loadDocScan(docRel);
    taken = collectTakenRefIds(scan);
  } catch {
    /* scaffold without doc is ok */
  }
  const keyword = normalizeRefIdKeyword(keywordRaw);
  const refId = suggestRefId(section, keyword, taken);
  const leaf = parseRefId(refId)?.keyword ?? keyword;
  const snip = scaffoldFlagSnippet({
    section,
    keyword: leaf,
    script: flagValue(argv, '--script') ?? 'bun:types-status',
    flag: keywordRaw.startsWith('-') ? keywordRaw : `--${leaf}`,
    shortcode: flagValue(argv, '--shortcode') ?? undefined,
    defaultValue: flagValue(argv, '--default') ?? undefined,
  });
  if (argv.includes('--json')) {
    process.stdout.write(
      `${JSON.stringify({ ...snip, section, keyword: leaf, doc: docRel }, null, 2)}\n`
    );
    return;
  }
  console.info(snip.markdown);
  console.info('');
  console.info(`# REF:ID ${snip.refId}  href ${snip.href}`);
  console.info(
    `# paste anchor near Flags block; append table row; wire flagDocRef('${leaf}') in code`
  );
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  const cmd = argv[0] && !argv[0]!.startsWith('-') ? argv[0]! : 'check';
  const rest = cmd === argv[0] ? argv.slice(1) : argv;
  if (cmd === 'help' || rest.includes('--help') || rest.includes('-h')) {
    printHelp();
    return;
  }
  if (cmd === 'check') await cmdCheck(rest);
  else if (cmd === 'audit') await cmdAudit(rest);
  else if (cmd === 'suggest') await cmdSuggest(rest);
  else if (cmd === 'list') await cmdList(rest);
  else if (cmd === 'scaffold') await cmdScaffold(rest);
  else {
    console.error(`unknown command: ${cmd}`);
    printHelp();
    process.exitCode = 1;
  }
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}

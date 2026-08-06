#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * docs-refid.ts — REF:ID v2 multi-command CLI (check · suggest · list · scaffold).
 *
 *   bun tools/docs-refid.ts check
 *   bun tools/docs-refid.ts check --strict-format
 *   bun tools/docs-refid.ts suggest --section=4.1 --keyword=refresh
 *   bun tools/docs-refid.ts suggest --section=4.1 --flag=--max-age-days
 *   bun tools/docs-refid.ts list [--doc=docs/design/bun-types-inventory.md]
 *   bun tools/docs-refid.ts scaffold --section=4.1 --flag=--foo-bar [--script=bun:types-status]
 *
 * Package aliases:
 *   bun run docs:refid:check · docs:refid:suggest · docs:refid:list · docs:refid:scaffold
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
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import { printRefIdIssues, refIdRegistry, runRefIdChecks } from './docs-refid-check.ts';
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
  console.log(`docs-refid — REF:ID v2 (check · suggest · list · scaffold)

Usage:
  bun tools/docs-refid.ts check [--strict-format] [--json] [--skip-refid-check]
  bun tools/docs-refid.ts suggest --section=4.1 --keyword=leaf | --flag=--cli-flag
                              [--doc=path] [--json]
  bun tools/docs-refid.ts list [--doc=path] [--json]
  bun tools/docs-refid.ts scaffold --section=4.1 --flag=--foo [--script=name] [--json]

Default --doc for suggest/list/scaffold: ${BUN_TYPES_INVENTORY_DOC}

Rules: lib/docs/ref-id.ts · style: docs/DEVELOPMENT-STANDARDS.md § REF:ID
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

async function cmdCheck(argv: string[]): Promise<void> {
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
  // also claim tool flags from registry
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
  // Prefer numbered REF:IDs / section anchors; slug TOC entries only with --all
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

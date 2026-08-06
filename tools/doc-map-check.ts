#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-openineditor — Bun.openInEditor
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * doc-map-check.ts — verify platform doc SSOT paths, markdown links, and REF:IDs.
 *
 * Scope: root MD + docs/* SSOT + lib/docs/repo-docs.ts CANONICAL_* paths.
 * Section-number REF:ID allowlist via lib/docs/refid-check.ts.
 * Does not scan projects/active.
 *
 * Usage:
 *   bun tools/doc-map-check.ts
 *   bun tools/doc-map-check.ts --open        # open first broken target
 *   bun tools/doc-map-check.ts --json
 *   bun tools/doc-map-check.ts --refid-strict
 *   bun tools/doc-map-check.ts --skip-refid-check
 *   bun run docs:refid:check                 # alias: --refid-strict
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { resolvePath, relativePath, dirnamePath } from '../lib/path-bun';
import {
  CANONICAL_REPO_DOCS,
  CANONICAL_HARNESS,
  CANONICAL_TOOLS,
  CANONICAL_DOC_ROLES,
} from '../lib/docs/repo-docs.ts';
import {
  REFID_DOC_ALLOWLIST,
  checkRefIdDocument,
  type RefIdIssue,
} from '../lib/docs/refid-check.ts';
import {
  BUN_TYPES_INVENTORY_DOC,
  buildStatusFlagRows,
  defaultStatusCli,
} from './bun-types-status.ts';

const REPO = resolvePath(import.meta.dir, '..');

const ROOT_MD = [
  'AGENTS.md',
  'README.md',
  'wiki-index.md',
  'registry-index.md',
  'STRUCTURE.md',
  '.custom-instructions.md',
  'docs/AGENTS.md',
  'docs/README.md',
  'docs/UNIFIED.md',
  'docs/WIRE_BOUNDARY.md',
  'docs/BUN_NATIVE_CAPABILITIES.md',
  'docs/BUN_DOCS_OPERATE.md',
  'docs/DEVELOPMENT-STANDARDS.md',
  'docs/IMPORT_BOUNDARIES.md',
  'lib/README.md',
  'lib/types/branded/README.md',
] as const;

type Issue = {
  kind: 'canonical-missing' | 'broken-link' | RefIdIssue['kind'];
  severity?: 'error' | 'warn';
  file: string;
  line?: number;
  target: string;
  detail?: string;
};

async function pathExists(p: string): Promise<boolean> {
  const abs = resolvePath(REPO, p.replace(/\/$/, ''));
  if (await Bun.file(abs).exists()) return true;
  // directories (Bun.file misses pure dirs)
  const dir = Bun.spawn(['test', '-e', abs], { stdout: 'ignore', stderr: 'ignore' });
  return (await dir.exited) === 0;
}

async function checkCanonical(): Promise<Issue[]> {
  const issues: Issue[] = [];
  const maps: Array<[string, Record<string, string>]> = [
    ['CANONICAL_REPO_DOCS', CANONICAL_REPO_DOCS as unknown as Record<string, string>],
    ['CANONICAL_HARNESS', CANONICAL_HARNESS as unknown as Record<string, string>],
    ['CANONICAL_TOOLS', CANONICAL_TOOLS as unknown as Record<string, string>],
  ];
  // roles keys must match docs keys
  for (const k of Object.keys(CANONICAL_DOC_ROLES)) {
    if (!(k in CANONICAL_REPO_DOCS)) {
      issues.push({
        kind: 'canonical-missing',
        file: 'lib/docs/repo-docs.ts',
        target: k,
        detail: 'CANONICAL_DOC_ROLES key missing from CANONICAL_REPO_DOCS',
      });
    }
  }
  for (const [name, obj] of maps) {
    for (const [key, path] of Object.entries(obj)) {
      if (typeof path !== 'string') continue;
      if (path.startsWith('http')) continue;
      if (!(await pathExists(path))) {
        issues.push({
          kind: 'canonical-missing',
          file: 'lib/docs/repo-docs.ts',
          target: path,
          detail: `${name}.${key}`,
        });
      }
    }
  }
  return issues;
}

async function checkMarkdownLinks(relFile: string): Promise<Issue[]> {
  const abs = resolvePath(REPO, relFile);
  if (!(await pathExists(relFile))) {
    return [
      { kind: 'canonical-missing', file: relFile, target: relFile, detail: 'SSOT file missing' },
    ];
  }
  const text = await Bun.file(abs).text();
  const issues: Issue[] = [];
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  const lines = text.split('\n');
  // map char offset to line — simple line scan
  let lineNo = 0;
  for (const line of lines) {
    lineNo++;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(line)) !== null) {
      const url = m[2]!.trim();
      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('mailto:') ||
        url.startsWith('#')
      ) {
        continue;
      }
      const pathPart = url.split('#')[0]!;
      if (!pathPart) continue;
      const target = resolvePath(dirnamePath(abs), pathPart);
      const relTarget = relativePath(REPO, target);
      if (!(await pathExists(relTarget))) {
        issues.push({
          kind: 'broken-link',
          file: relFile,
          line: lineNo,
          target: pathPart,
          detail: url,
        });
      }
    }
  }
  return issues;
}

async function checkRefIds(opts: { strict: boolean }): Promise<Issue[]> {
  const issues: Issue[] = [];
  const toolingByDoc = new Map<string, { refId: string; href: string }[]>();
  toolingByDoc.set(
    BUN_TYPES_INVENTORY_DOC,
    buildStatusFlagRows(defaultStatusCli()).map(r => ({ refId: r.refId, href: r.href }))
  );

  for (const entry of REFID_DOC_ALLOWLIST) {
    const abs = resolvePath(REPO, entry.path);
    if (!(await Bun.file(abs).exists())) {
      issues.push({
        kind: 'canonical-missing',
        severity: 'error',
        file: entry.path,
        target: entry.path,
        detail: 'REF:ID allowlist file missing',
      });
      continue;
    }
    const text = await Bun.file(abs).text();
    const found = checkRefIdDocument({
      path: entry.path,
      text,
      toolingRefs: toolingByDoc.get(entry.path) ?? [],
      sectionRefId: entry.sectionRefId,
      sectionHeading: entry.sectionHeading,
      strict: opts.strict,
    });
    for (const i of found) {
      issues.push({
        kind: i.kind,
        severity: i.severity,
        file: i.file,
        line: i.line,
        target: i.target,
        detail: i.detail,
      });
    }
  }
  return issues;
}

function printIssues(issues: Issue[]): void {
  if (issues.length === 0) {
    console.info('✅ doc-map-check: all CANONICAL_* paths, SSOT markdown links, and REF:IDs OK');
    return;
  }
  const errors = issues.filter(i => (i.severity ?? 'error') === 'error');
  const warns = issues.filter(i => i.severity === 'warn');
  console.info(
    `\n❌ doc-map-check: ${errors.length} error(s)` +
      (warns.length ? `, ${warns.length} warning(s)` : '') +
      `\n`
  );
  const byFile = new Map<string, Issue[]>();
  for (const i of issues) {
    if (!byFile.has(i.file)) byFile.set(i.file, []);
    byFile.get(i.file)!.push(i);
  }
  for (const [file, rows] of [...byFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.info(`## ${file}`);
    for (const r of rows) {
      const loc = r.line != null ? `${file}:${r.line}` : file;
      const sev = r.severity ?? 'error';
      console.info(`  ${loc}`);
      console.info(`    [${sev}/${r.kind}] ${r.target}${r.detail ? `  (${r.detail})` : ''}`);
    }
    console.info('');
  }
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  const asJson = argv.includes('--json');
  const open = argv.includes('--open');
  const refidStrict = argv.includes('--refid-strict');
  const skipRefid =
    argv.includes('--skip-refid-check') ||
    Bun.env.SKIP_DOC_REFID === '1' ||
    Bun.env.SKIP_DOC_REFID === 'true';

  const issues: Issue[] = [];
  issues.push(...(await checkCanonical()));
  for (const f of ROOT_MD) {
    issues.push(...(await checkMarkdownLinks(f)));
  }
  if (!skipRefid) {
    issues.push(...(await checkRefIds({ strict: refidStrict })));
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ count: issues.length, issues }, null, 2)}\n`);
  } else {
    printIssues(issues);
  }

  if (open && issues.length > 0 && typeof Bun.openInEditor === 'function') {
    const first = issues[0]!;
    const abs = resolvePath(REPO, first.file);
    console.info(`✏️  open ${first.file}${first.line != null ? `:${first.line}` : ''}`);
    Bun.openInEditor(abs, { line: first.line ?? 1 });
  }

  // Warnings alone do not fail soft mode; errors do. Strict promotes format warns → errors.
  const hard = issues.filter(i => (i.severity ?? 'error') === 'error');
  if (hard.length > 0) process.exitCode = 1;
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}

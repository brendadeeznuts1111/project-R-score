#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * md-link-check.ts — live markdown relative-link ratchet (non-archive).
 *
 * Scans root *.md plus docs/lib/.agents/tools/examples and projects triage
 * READMEs (depth ≤2 under active/experimental). Skips archives, retired trees,
 * node_modules. Complements docs:map:check (SSOT paths only).
 *
 * Usage:
 *   bun tools/md-link-check.ts
 *   bun tools/md-link-check.ts --json
 *   bun run docs:links:check
 */
import { dirnamePath, joinPath, relativePath, resolvePath } from '../lib/path-bun.ts';

const REPO = resolvePath(import.meta.dir, '..');

const SCAN_ROOTS = ['docs', 'lib', '.agents', 'tools', 'examples'] as const;

const SKIP_DIR_RE = /(?:^|\/)(?:node_modules|\.git|archives|retired-[^/]+|dist|coverage)(?:\/|$)/;

type Issue = {
  file: string;
  line: number;
  target: string;
};

async function pathExists(abs: string): Promise<boolean> {
  if (await Bun.file(abs).exists()) return true;
  const dir = Bun.spawn(['test', '-e', abs], { stdout: 'ignore', stderr: 'ignore' });
  return (await dir.exited) === 0;
}

function normalizeTarget(raw: string): string | null {
  let target = raw.trim();
  const title = target.indexOf(' "');
  if (title > 0) target = target.slice(0, title);
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1);
  }
  if (
    !target ||
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('#') ||
    target.startsWith('/')
  ) {
    return null;
  }
  // Skip editor-style path:line refs
  if (/:\d+$/.test(target)) return null;
  const hash = target.indexOf('#');
  const pathPart = hash >= 0 ? target.slice(0, hash) : target;
  return pathPart || null;
}

async function checkFile(abs: string): Promise<Issue[]> {
  const relFile = relativePath(REPO, abs);
  let text: string;
  try {
    text = await Bun.file(abs).text();
  } catch {
    return [];
  }
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  const issues: Issue[] = [];
  const lines = text.split('\n');
  const base = dirnamePath(abs);
  for (let i = 0; i < lines.length; i++) {
    linkRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(lines[i]!)) !== null) {
      const pathPart = normalizeTarget(m[2]!);
      if (!pathPart) continue;
      const target = pathPart.startsWith('/') ? pathPart : resolvePath(base, pathPart);
      if (!(await pathExists(target))) {
        issues.push({ file: relFile, line: i + 1, target: pathPart });
      }
    }
  }
  return issues;
}

function shouldSkip(rel: string): boolean {
  return SKIP_DIR_RE.test(rel);
}

async function collectFiles(): Promise<string[]> {
  const out: string[] = [];
  for await (const f of new Bun.Glob('*.md').scan({ cwd: REPO, onlyFiles: true })) {
    if (!shouldSkip(f)) out.push(joinPath(REPO, f));
  }
  for (const root of SCAN_ROOTS) {
    const base = joinPath(REPO, root);
    if (!(await pathExists(base))) continue;
    for await (const f of new Bun.Glob('**/*.{md,mdc}').scan({
      cwd: base,
      onlyFiles: true,
    })) {
      const rel = `${root}/${f}`;
      if (shouldSkip(rel)) continue;
      out.push(joinPath(REPO, rel));
    }
  }
  // Projects triage: root + category + product-leaf READMEs (depth ≤ 3 under active/)
  out.push(joinPath(REPO, 'projects/README.md'));
  out.push(joinPath(REPO, 'projects/experimental/README.md'));
  for (const root of ['projects/active', 'projects/experimental'] as const) {
    const base = joinPath(REPO, root);
    if (!(await pathExists(base))) continue;
    for await (const f of new Bun.Glob('**/README.md').scan({
      cwd: base,
      onlyFiles: true,
    })) {
      const depth = f.split('/').length;
      // active/<cat>/README or active/<cat>/<leaf>/README or experimental/<leaf>/README
      if (root === 'projects/active' && depth > 3) continue;
      if (root === 'projects/experimental' && depth > 2) continue;
      const rel = `${root}/${f}`;
      if (shouldSkip(rel)) continue;
      out.push(joinPath(REPO, rel));
    }
  }
  return [...new Set(out)];
}

async function main(): Promise<void> {
  const asJson = Bun.argv.includes('--json');
  const files = await collectFiles();
  const issues: Issue[] = [];
  for (const abs of files) {
    issues.push(...(await checkFile(abs)));
  }

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ scanned: files.length, count: issues.length, issues }, null, 2)}\n`
    );
  } else if (issues.length === 0) {
    console.info(`✅ md-link-check: ${files.length} files, 0 broken relative links`);
  } else {
    console.info(`\n❌ md-link-check: ${issues.length} broken link(s) in ${files.length} files\n`);
    for (const i of issues) {
      console.info(`  ${i.file}:${i.line} → ${i.target}`);
    }
    console.info('');
  }

  if (issues.length > 0) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}

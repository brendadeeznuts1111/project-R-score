#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * branded-id-check.ts — detector for unbranded ID declarations.
 *
 * Flags TypeScript property declarations shaped like `id: string` /
 * `userId?: string` that should use branded ID types from
 * lib/types/branded.ts (see its header for the migration plan).
 *
 * Usage:
 *   bun tools/branded-id-check.ts [paths...]   # report (exit 0)
 *   bun tools/branded-id-check.ts --strict     # exit 1 on violations
 *   bun tools/branded-id-check.ts --staged     # scan staged files only
 *
 * Suppression: end a declaration line with `// brand-ok` to skip it
 * (for IDs that are genuinely opaque passthroughs).
 * Brand foundation: lib/types/branded.ts
 */

const ID_DECL = /^\s*(?:readonly\s+)?[a-zA-Z_]*(?:id|Id|ID)[a-zA-Z_]*\??:\s*string\b/;
const SKIP_FILE = /lib\/types\/branded\.ts$/;
const SKIP_LINE = /brand-ok/;

async function collectFiles(args: string[]): Promise<string[]> {
  if (args.includes('--staged')) {
    const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      stdout: 'pipe',
    });
    const out = await new Response(proc.stdout).text();
    return out
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.endsWith('.ts'));
  }
  const paths = args.filter(a => !a.startsWith('--'));
  const roots = paths.length > 0 ? paths : ['lib'];
  const files: string[] = [];
  for (const root of roots) {
    const stat = await Bun.file(root)
      .stat()
      .catch(() => null);
    if (stat?.isDirectory()) {
      const glob = new Bun.Glob('**/*.ts');
      for await (const f of glob.scan({ cwd: root, absolute: true })) files.push(f);
    } else if (root.endsWith('.ts')) {
      files.push(root);
    }
  }
  return files;
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const strict = args.includes('--strict');
  const files = await collectFiles(args);

  const perDir = new Map<string, number>();
  let total = 0;
  for (const file of files) {
    if (SKIP_FILE.test(file)) continue;
    const text = await Bun.file(file).text();
    const lines = text.split('\n');
    let fileCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (SKIP_LINE.test(line)) continue;
      if (ID_DECL.test(line)) {
        fileCount++;
        total++;
      }
    }
    if (fileCount > 0) {
      const rel = file.replace(/^.*?(?=lib\/|scripts\/|tools\/|tests\/|dashboard\/)/, '');
      const dir = rel.split('/').slice(0, 2).join('/');
      perDir.set(dir, (perDir.get(dir) ?? 0) + fileCount);
      if (strict || files.length <= 20) {
        // detailed output for small scans
        for (let i = 0; i < lines.length; i++) {
          if (!SKIP_LINE.test(lines[i]) && ID_DECL.test(lines[i])) {
            console.info(`  ${file}:${i + 1}: ${lines[i].trim()}`);
          }
        }
      }
    }
  }

  console.info(`\n📋 Unbranded ID declarations: ${total}`);
  for (const [dir, n] of [...perDir.entries()].sort((a, b) => b[1] - a[1])) {
    console.info(`   ${String(n).padStart(4)}  ${dir}`);
  }
  console.info('   → brands + constructors: lib/types/branded.ts; suppress with // brand-ok');

  if (strict && total > 0) process.exit(1);
}

await main();

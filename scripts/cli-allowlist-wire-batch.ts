#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
/**
 * Wire applyUnknownLongOptionGuardFor into entry files for one agent batch.
 *
 *   bun scripts/cli-allowlist-wire-batch.ts --batch=1 --dry-run
 *   bun scripts/cli-allowlist-wire-batch.ts --batch=1 --write
 *
 * Reads artifacts/cli-allowlist-team/batch-N.json.
 * Writes artifacts/cli-allowlist-team/result-N.json.
 *
 * Patterns handled:
 * 1. `const argv = Bun.argv.slice(2)` / process.argv
 * 2. `const x = Bun.argv.slice(2)` then includes
 * 3. Top-level `Bun.argv.includes('--flag')` → guard first into `argv`, then includes on argv
 * 4. `main()` with `Bun.argv.slice(2)` inside
 *
 * Complex files are skipped with notes for human/agent follow-up.
 */
import { resolvePath } from '../lib/path-bun.ts';

function argValue(argv: string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

const raw = import.meta.main
  ? applyUnknownLongOptionGuardFor('cli:allowlist:wire', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const batchNum = argValue(raw, '--batch') ?? '1';
const WRITE = raw.includes('--write');
const DRY = !WRITE;

type Row = {
  key: string;
  path: string;
  leaves: string[];
  scripts: string[];
};

type Result = {
  key: string;
  path: string;
  leaves: string[];
  wired: boolean;
  notes: string;
};

function importLine(path: string): string {
  const depth = path.startsWith('tools/') ? 1 : path.startsWith('scripts/') ? 1 : 1;
  const rel = depth === 1 ? '../lib/docs/ref-id-tool-flags.ts' : '../lib/docs/ref-id-tool-flags.ts';
  // tools/ and scripts/ are both one level under root
  const fromRoot = path.startsWith('tools/') || path.startsWith('scripts/');
  const imp = fromRoot
    ? `import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';`
    : `import { applyUnknownLongOptionGuardFor } from './lib/docs/ref-id-tool-flags.ts';`;
  return imp;
}

function wireFile(text: string, key: string, path: string): { text: string; notes: string } | null {
  if (text.includes('applyUnknownLongOptionGuard')) {
    return { text, notes: 'already guarded' };
  }

  let next = text;
  const imp = importLine(path);

  // Ensure import
  if (!next.includes('ref-id-tool-flags')) {
    // after last import or after shebang/see block
    const importBlock = next.match(
      /^(?:(?:\/\/.*\n)|(?:#!.*\n)|(?:\s*\n))*((?:import[\s\S]*?;\n)+)/
    );
    if (importBlock) {
      const end = importBlock[0].length;
      next = next.slice(0, end) + imp + '\n' + next.slice(end);
    } else {
      // insert after header comments
      const m = next.match(/^(?:#!.*\n)?(?:\/\/.*\n)*/);
      const at = m ? m[0].length : 0;
      next = next.slice(0, at) + imp + '\n' + next.slice(at);
    }
  }

  // Pattern A: const argv = Bun.argv.slice(2) or process.argv
  if (/\bconst\s+argv\s*=\s*(?:Bun|process)\.argv\.slice\(2\)/.test(next)) {
    next = next.replace(
      /\bconst\s+argv\s*=\s*(?:Bun|process)\.argv\.slice\(2\)/,
      `const argv = applyUnknownLongOptionGuardFor('${key}', Bun.argv.slice(2))`
    );
    return { text: next, notes: 'wired const argv =' };
  }

  // Pattern B: const args = Bun.argv.slice(2)
  if (/\bconst\s+args\s*=\s*(?:Bun|process)\.argv\.slice\(2\)/.test(next)) {
    next = next.replace(
      /\bconst\s+args\s*=\s*(?:Bun|process)\.argv\.slice\(2\)/,
      `const args = applyUnknownLongOptionGuardFor('${key}', Bun.argv.slice(2))`
    );
    return { text: next, notes: 'wired const args =' };
  }

  // Pattern C: const a = Bun.argv.slice(2) used as argv-like
  if (/\bconst\s+([a-zA-Z_][\w]*)\s*=\s*(?:Bun|process)\.argv\.slice\(2\)/.test(next)) {
    next = next.replace(
      /\bconst\s+([a-zA-Z_][\w]*)\s*=\s*(?:Bun|process)\.argv\.slice\(2\)/,
      `const $1 = applyUnknownLongOptionGuardFor('${key}', Bun.argv.slice(2))`
    );
    return { text: next, notes: 'wired const <name> = slice(2)' };
  }

  // Pattern D: top-level Bun.argv.includes / new Set(Bun.argv…) — introduce guarded argv
  if (
    (/Bun\.argv\.includes\(/.test(next) || /new Set\(\s*Bun\.argv/.test(next)) &&
    !/Bun\.argv\.slice\(2\)/.test(next)
  ) {
    // Insert after imports (last import line) or after header
    let insertAt = -1;
    const lastImport = [...next.matchAll(/^import .*;\n/gm)].pop();
    if (lastImport && lastImport.index !== undefined) {
      insertAt = lastImport.index + lastImport[0].length;
    } else {
      const m = next.match(/^(?:#!.*\n)?(?:\/\/.*\n)*(?:\s*\n)*/);
      insertAt = m ? m[0].length : 0;
    }
    const guardLine = `\nconst argv = applyUnknownLongOptionGuardFor('${key}', Bun.argv.slice(2));\n`;
    next = next.slice(0, insertAt) + guardLine + next.slice(insertAt);
    next = next.replace(/Bun\.argv\.includes\(/g, 'argv.includes(');
    next = next.replace(/new Set\(\s*Bun\.argv\.slice\(2\)\s*\)/g, 'new Set(argv)');
    next = next.replace(/new Set\(\s*Bun\.argv\s*\)/g, 'new Set(argv)');
    return { text: next, notes: 'wired Bun.argv.includes → argv' };
  }

  // Pattern D2: process.argv.includes
  if (/process\.argv\.includes\(/.test(next) && !/process\.argv\.slice\(2\)/.test(next)) {
    let insertAt = -1;
    const lastImport = [...next.matchAll(/^import .*;\n/gm)].pop();
    if (lastImport && lastImport.index !== undefined) {
      insertAt = lastImport.index + lastImport[0].length;
    } else {
      insertAt = 0;
    }
    const guardLine = `\nconst argv = applyUnknownLongOptionGuardFor('${key}', Bun.argv.slice(2));\n`;
    next = next.slice(0, insertAt) + guardLine + next.slice(insertAt);
    next = next.replace(/process\.argv\.includes\(/g, 'argv.includes(');
    return { text: next, notes: 'wired process.argv.includes → argv' };
  }

  // Pattern E: main() with slice inside
  if (
    /async function main|function main/.test(next) &&
    /(?:Bun|process)\.argv\.slice\(2\)/.test(next)
  ) {
    next = next.replace(
      /(?:Bun|process)\.argv\.slice\(2\)/g,
      `applyUnknownLongOptionGuardFor('${key}', Bun.argv.slice(2))`
    );
    // Avoid double-wrap if already applied multiple times — only first occurrence ideally
    // If multiple slice(2), all get guard - OK if same argv
    return { text: next, notes: 'wired main() slice(2)' };
  }

  // Pattern F: import.meta.main with slice
  if (/import\.meta\.main/.test(next) && /(?:Bun|process)\.argv\.slice\(2\)/.test(next)) {
    next = next.replace(
      /(?:Bun|process)\.argv\.slice\(2\)/g,
      `applyUnknownLongOptionGuardFor('${key}', Bun.argv.slice(2))`
    );
    return { text: next, notes: 'wired import.meta.main slice' };
  }

  // Pattern G: parseArgs(Bun.argv.slice(2))
  if (/parseArgs\(\s*(?:Bun|process)\.argv\.slice\(2\)\s*\)/.test(next)) {
    next = next.replace(
      /parseArgs\(\s*(?:Bun|process)\.argv\.slice\(2\)\s*\)/g,
      `parseArgs(applyUnknownLongOptionGuardFor('${key}', Bun.argv.slice(2)))`
    );
    return { text: next, notes: 'wired parseArgs(slice)' };
  }

  return null;
}

async function main(): Promise<void> {
  const batchPath = `artifacts/cli-allowlist-team/batch-${batchNum}.json`;
  const batch = (await Bun.file(batchPath).json()) as { rows: Row[]; batch: number };
  const results: Result[] = [];
  let wired = 0;
  let skipped = 0;

  for (const row of batch.rows) {
    const abs = resolvePath(process.cwd(), row.path);
    const file = Bun.file(abs);
    if (!(await file.exists())) {
      results.push({
        key: row.key,
        path: row.path,
        leaves: row.leaves,
        wired: false,
        notes: 'file missing',
      });
      skipped++;
      continue;
    }
    const text = await file.text();
    const out = wireFile(text, row.key, row.path);
    if (!out) {
      results.push({
        key: row.key,
        path: row.path,
        leaves: row.leaves,
        wired: false,
        notes: 'no automatic pattern — needs agent hand-wire',
      });
      skipped++;
      continue;
    }
    if (out.notes === 'already guarded') {
      results.push({
        key: row.key,
        path: row.path,
        leaves: row.leaves,
        wired: true,
        notes: out.notes,
      });
      wired++;
      continue;
    }
    if (WRITE) {
      await Bun.write(abs, out.text);
    }
    results.push({
      key: row.key,
      path: row.path,
      leaves: row.leaves,
      wired: true,
      notes: DRY ? `[dry-run] ${out.notes}` : out.notes,
    });
    wired++;
  }

  const summary = {
    batch: Number(batchNum),
    dryRun: DRY,
    wired,
    skipped,
    total: batch.rows.length,
    results,
  };
  const outPath = `artifacts/cli-allowlist-team/result-${batchNum}.json`;
  if (WRITE || DRY) {
    await Bun.write(outPath, `${JSON.stringify(summary, null, 2)}\n`);
  }
  console.log(
    `batch ${batchNum}: wired=${wired} skipped=${skipped} total=${batch.rows.length} ${DRY ? '(dry-run)' : '(wrote)'}`
  );
  console.log(`→ ${outPath}`);
}

await main();

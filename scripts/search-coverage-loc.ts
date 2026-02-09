#!/usr/bin/env bun

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Options = {
  roots: string[];
  overlap: 'ignore' | 'remove';
};

type FileStat = {
  path: string;
  lines: number;
  bytes: number;
  hash: string;
};

const SOURCE_GLOBS = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs'];
const EXCLUDE_GLOBS = [
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/.git/**',
  '!**/coverage/**',
  '!**/*.min.js',
  '!**/*.bundle.js',
];

function parsePathList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseArgs(argv: string[]): Options {
  const roots: string[] = ['./lib'];
  let overlap: 'ignore' | 'remove' = 'ignore';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--path') {
      const parsed = parsePathList(argv[i + 1]);
      if (parsed.length > 0) {
        const current = roots.length === 1 && roots[0] === './lib' ? [] : [...roots];
        roots.length = 0;
        roots.push(...Array.from(new Set([...current, ...parsed])));
      }
      i += 1;
      continue;
    }
    if (arg === '--overlap') {
      const value = (argv[i + 1] || '').trim().toLowerCase();
      if (value === 'ignore' || value === 'remove') {
        overlap = value;
      }
      i += 1;
      continue;
    }
  }

  return { roots, overlap };
}

function buildRgArgs(roots: string[]): string[] {
  const args = ['--files'];
  for (const glob of SOURCE_GLOBS) {
    args.push('--glob', glob);
  }
  for (const glob of EXCLUDE_GLOBS) {
    args.push('--glob', glob);
  }
  args.push(...roots);
  return args;
}

async function collectFiles(roots: string[]): Promise<string[]> {
  const proc = Bun.spawn(['rg', ...buildRgArgs(roots)], { stdout: 'pipe', stderr: 'ignore' });
  const stdout = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0 && code !== 1) {
    throw new Error(`rg failed with exit code ${code}`);
  }
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((path) => resolve(path));
}

function countLines(content: string): number {
  if (content.length === 0) return 0;
  return content.split('\n').length;
}

async function fileStats(files: string[]): Promise<FileStat[]> {
  const out: FileStat[] = [];
  for (const path of files) {
    try {
      const content = await readFile(path, 'utf8');
      out.push({
        path,
        lines: countLines(content),
        bytes: Buffer.byteLength(content),
        hash: createHash('sha1').update(content).digest('hex'),
      });
    } catch {
      // ignore unreadable files
    }
  }
  return out;
}

async function main(): Promise<void> {
  const { roots, overlap } = parseArgs(process.argv.slice(2));
  const files = await collectFiles(roots);
  const stats = await fileStats(files);

  const totalFiles = stats.length;
  const totalLines = stats.reduce((sum, s) => sum + s.lines, 0);

  let uniqueFiles = totalFiles;
  let uniqueLines = totalLines;

  if (overlap === 'remove') {
    const byHash = new Map<string, FileStat>();
    for (const item of stats) {
      if (!byHash.has(item.hash)) {
        byHash.set(item.hash, item);
      }
    }
    const deduped = [...byHash.values()];
    uniqueFiles = deduped.length;
    uniqueLines = deduped.reduce((sum, s) => sum + s.lines, 0);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    roots,
    overlap,
    totals: {
      files: totalFiles,
      lines: totalLines,
      uniqueFiles,
      uniqueLines,
      overlapFiles: totalFiles - uniqueFiles,
      overlapLines: totalLines - uniqueLines,
    },
  };

  const md = [
    '# Search LOC Coverage',
    '',
    `- Generated: ${payload.generatedAt}`,
    `- Roots: \`${roots.join(', ')}\``,
    `- Overlap mode: \`${overlap}\``,
    '',
    `- Files: **${totalFiles}**`,
    `- Lines: **${totalLines}**`,
    `- Unique Files: **${uniqueFiles}**`,
    `- Unique Lines: **${uniqueLines}**`,
    `- Overlap Files: **${totalFiles - uniqueFiles}**`,
    `- Overlap Lines: **${totalLines - uniqueLines}**`,
    '',
  ].join('\n');

  await Bun.write('reports/search-coverage-loc-latest.json', `${JSON.stringify(payload, null, 2)}\n`);
  await Bun.write('reports/search-coverage-loc-latest.md', `${md}\n`);
  console.log('[search:coverage:loc] wrote reports/search-coverage-loc-latest.json');
  console.log('[search:coverage:loc] wrote reports/search-coverage-loc-latest.md');
}

await main();


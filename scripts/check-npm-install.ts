#!/usr/bin/env bun
/**
 * Block non-Bun install commands in root production paths.
 *
 * Nested projects and vendored skills retain their own package-manager policy;
 * this gate owns the root workflows, scripts, tools, libraries, and scripts map.
 */
import { parse } from 'yaml';
import { fileExists, joinPath, listFilesSync, readJson, readText } from './lib/fs-bun';

const ROOT = `${import.meta.dir}/..`;

type Violation = {
  file: string;
  line: number;
  rule: string;
  snippet: string;
};

const BLOCKED_COMMANDS = [
  { pattern: /\bnpm\s+(?:i|install|ci)\b/, rule: 'npm install' },
  { pattern: /\byarn\s+install\b/, rule: 'yarn install' },
  { pattern: /\bpnpm\s+(?:i|install)\b/, rule: 'pnpm install' },
] as const;

const ALLOWED_PATHS = new Set([
  '.npmrc',
  'tools/bun-doc-refs.ts',
  'tools/bun-docs-catalog.json',
  'tools/bun-docs-index.json',
  'tools/bun-docs-llms-full.txt',
  'tools/verify-guides.ts',
]);

function findCommand(value: string): string | null {
  return BLOCKED_COMMANDS.find(({ pattern }) => pattern.test(value))?.rule ?? null;
}

function snippet(value: string): string {
  const compact = value.trim().replace(/\s+/g, ' ');
  return compact.length > 100 ? `${compact.slice(0, 99)}…` : compact;
}

function withoutCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '')
    .replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, '""');
}

export function findBlockedInstallCommands(
  source: string,
  file = '<source>',
  codeAware = false
): Violation[] {
  const inspected = codeAware ? withoutCommentsAndStrings(source) : source;
  const rawLines = source.split('\n');
  return inspected.split('\n').flatMap((line, index) => {
    const rule = findCommand(line);
    return rule ? [{ file, line: index + 1, rule, snippet: snippet(rawLines[index] ?? line) }] : [];
  });
}

// eslint-disable-next-line harness/no-unknown-function-param -- parsed workflow YAML is the wire boundary
function visitWorkflow(value: unknown, file: string, violations: Violation[]): void {
  if (Array.isArray(value)) {
    for (const item of value) visitWorkflow(item, file, violations);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'run' && typeof child === 'string') {
      const rule = findCommand(child);
      if (rule) violations.push({ file, line: 0, rule, snippet: snippet(child) });
    } else {
      visitWorkflow(child, file, violations);
    }
  }
}

async function scanWorkflows(): Promise<Violation[]> {
  const violations: Violation[] = [];
  for (const pattern of ['.github/workflows/*.yml', '.github/workflows/*.yaml']) {
    for (const file of listFilesSync(pattern, { cwd: ROOT, dot: true })) {
      const text = await readText(joinPath(ROOT, file));
      try {
        visitWorkflow(parse(text, { logLevel: 'silent' }), file, violations);
      } catch {
        violations.push(...findBlockedInstallCommands(text, file));
      }
    }
  }
  return violations;
}

async function scanPackageScripts(): Promise<Violation[]> {
  const pkg = await readJson<{ scripts?: Record<string, string> }>(joinPath(ROOT, 'package.json'));
  return Object.entries(pkg.scripts ?? {}).flatMap(([name, command]) => {
    const rule = findCommand(command);
    return rule ? [{ file: 'package.json', line: 0, rule, snippet: `script "${name}"` }] : [];
  });
}

async function scanSourceTree(): Promise<Violation[]> {
  const violations: Violation[] = [];
  for (const pattern of ['scripts/**/*.{ts,sh}', 'tools/**/*.{ts,sh}', 'lib/**/*.{ts,sh}']) {
    for (const file of listFilesSync(pattern, { cwd: ROOT })) {
      if (ALLOWED_PATHS.has(file)) continue;
      const text = await readText(joinPath(ROOT, file));
      violations.push(...findBlockedInstallCommands(text, file, file.endsWith('.ts')));
    }
  }
  return violations;
}

export async function runNpmInstallCheck(): Promise<{
  ok: boolean;
  violations: Violation[];
  allowedPaths: string[];
}> {
  const allowedPaths: string[] = [];
  for (const file of ALLOWED_PATHS) {
    if (await fileExists(joinPath(ROOT, file))) allowedPaths.push(file);
  }
  const violations = [
    ...(await scanWorkflows()),
    ...(await scanPackageScripts()),
    ...(await scanSourceTree()),
  ];
  return { ok: violations.length === 0, violations, allowedPaths };
}

async function main(): Promise<void> {
  const result = await runNpmInstallCheck();
  if (result.ok) {
    console.info(
      `✅ root install policy: Bun only (${result.allowedPaths.length} documented exception paths)`
    );
    return;
  }
  console.error(
    `❌ ${result.violations.length} non-Bun install command(s) in root production paths`
  );
  for (const item of result.violations) {
    console.error(
      `  ${item.file}${item.line ? `:${item.line}` : ''} [${item.rule}] ${item.snippet}`
    );
  }
  process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}

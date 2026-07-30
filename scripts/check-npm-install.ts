#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.table
/**
 * Block npm/yarn/pnpm install commands in root production paths.
 *
 * Scans:
 *   - .github/workflows/*.yml (CI step commands)
 *   - root package.json scripts
 *   - scripts/, tools/, lib/ TypeScript + shell scripts
 *   - .npmrc for npm-client configuration drift
 *
 * Nested projects/, packages/, and vendored skill docs are outside the root
 * production path and are not scanned here.
 *
 *   bun run check:npm-install
 */
export {};

import { parse } from 'yaml';
import { joinPath } from './lib/fs-bun';
import { inspectTable } from '../lib/console-depth';

const ROOT = `${import.meta.dir}/..`;

type Violation = {
  file: string;
  line: number;
  snippet: string;
  rule: string;
};

const BLOCKED_COMMANDS = [
  { re: /\bnpm\s+install\b/, name: 'npm install' },
  { re: /\bnpm\s+ci\b/, name: 'npm ci' },
  { re: /\byarn\s+install\b/, name: 'yarn install' },
  { re: /\bpnpm\s+install\b/, name: 'pnpm install' },
];

/**
 * Paths that are allowed to mention blocked install commands or retain npm
 * client configuration. Keep this list small and intentional.
 */
const ALLOW_LIST = new Set([
  // npm client config retained for non-Bun tooling compatibility; explicit exception
  '.npmrc',
  // Generated Bun docs indices/catalogs intentionally catalog npm→bun migration content
  'tools/bun-docs-index.json',
  'tools/bun-docs-catalog.json',
  'tools/bun-docs-llms-full.txt',
  // Migration-guide tooling intentionally references npm install
  'tools/bun-doc-refs.ts',
  'tools/verify-guides.ts',
]);

/** .npmrc keys that indicate npm-client configuration drift in a Bun monorepo. */
const NPMRC_DRIFT_KEYS = /\b(package-lock|package-lock-only|fund|loglevel|progress)\b/;

function isAllowed(rel: string): boolean {
  if (ALLOW_LIST.has(rel)) return true;
  for (const prefix of ALLOW_LIST) {
    if (prefix.endsWith('/') && rel.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Strip multi-line comments while preserving newline positions so line numbers
 * stay accurate, then drop single-line comments and string/template literals.
 */
function stripCommentsPreservingLines(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '));
}

function codeOnly(line: string): string {
  return line.replace(/\/\/.*$/, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
}

function* scanCodeLines(text: string): Generator<{ line: number; code: string; raw: string }> {
  const stripped = stripCommentsPreservingLines(text);
  const lines = stripped.split('\n');
  const rawLines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    yield { line: i + 1, code: codeOnly(lines[i]), raw: rawLines[i] };
  }
}

function* scanRawLines(text: string): Generator<{ line: number; raw: string }> {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    yield { line: i + 1, raw: lines[i] };
  }
}

function truncateSnippet(raw: string, max = 80): string {
  const trimmed = raw.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function checkYamlString(value: string, violations: Violation[], file: string): void {
  for (const { re, name } of BLOCKED_COMMANDS) {
    if (re.test(value)) {
      violations.push({ file, line: 0, snippet: truncateSnippet(value), rule: name });
      break;
    }
  }
}

/** Walk YAML parse tree (wire) looking for blocked `run:` commands. */
function normalizeYamlValue(value: unknown, violations: Violation[], file: string): void {
  if (Array.isArray(value)) {
    for (const item of value) normalizeYamlValue(item, violations, file);
  } else if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      if (key === 'run' && typeof val === 'string') {
        checkYamlString(val, violations, file);
      } else {
        normalizeYamlValue(val, violations, file);
      }
    }
  }
}

function checkWorkflowRaw(text: string, violations: Violation[], file: string): void {
  const lines = text.split('\n');
  let inRunBlock = false;
  let runIndent = -1;
  for (const raw of lines) {
    const match = raw.match(/^(\s*)-?\s*run:\s*([|>])?\s*(.*)$/);
    if (match) {
      inRunBlock = true;
      runIndent = match[1].length;
      const inline = match[3];
      if (inline) checkYamlString(inline, violations, file);
      if (!match[2]) inRunBlock = false;
      continue;
    }
    if (inRunBlock) {
      const indent = raw.search(/\S|$/);
      if (raw.trim() === '' || indent > runIndent) {
        checkYamlString(raw, violations, file);
      } else {
        inRunBlock = false;
      }
    }
  }
}

async function checkWorkflows(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const glob = new Bun.Glob('.github/workflows/*.{yml,yaml}');
  for (const rel of glob.scanSync({ cwd: ROOT, onlyFiles: true })) {
    if (isAllowed(rel)) continue;
    const text = await Bun.file(joinPath(ROOT, rel)).text();
    try {
      const doc = parse(text, { logLevel: 'error' }) as Record<string, unknown>;
      normalizeYamlValue(doc, violations, rel);
    } catch {
      // Fallback for workflows that use GitHub-Actions-specific YAML syntax
      // the strict parser cannot handle (e.g., JS template literals with !tags).
      checkWorkflowRaw(text, violations, rel);
    }
  }
  return violations;
}

async function checkPackageScripts(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const rel = 'package.json';
  if (isAllowed(rel)) return violations;
  if (!(await Bun.file(joinPath(ROOT, rel)).exists())) return violations;

  const pkg = (await Bun.file(joinPath(ROOT, rel)).json()) as {
    scripts?: Record<string, string>;
  };
  if (!pkg.scripts) return violations;

  for (const [scriptName, value] of Object.entries(pkg.scripts)) {
    for (const { re, name } of BLOCKED_COMMANDS) {
      if (re.test(value)) {
        violations.push({
          file: rel,
          line: 0,
          snippet: `script "${scriptName}"`,
          rule: name,
        });
        break;
      }
    }
  }
  return violations;
}

async function checkSourceTree(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const globs = ['scripts/**/*.{ts,sh}', 'tools/**/*.{ts,sh}', 'lib/**/*.{ts,sh}'] as const;

  for (const pattern of globs) {
    for (const rel of new Bun.Glob(pattern).scanSync({ cwd: ROOT, onlyFiles: true })) {
      if (isAllowed(rel)) continue;
      const text = await Bun.file(joinPath(ROOT, rel)).text();
      const strip = rel.endsWith('.ts');
      const lines = strip ? scanCodeLines(text) : scanRawLines(text);
      for (const { line, raw, code } of lines) {
        const target = strip ? code : raw;
        for (const { re, name } of BLOCKED_COMMANDS) {
          if (re.test(target)) {
            violations.push({ file: rel, line, snippet: truncateSnippet(raw), rule: name });
            break;
          }
        }
      }
    }
  }
  return violations;
}

async function checkNpmrcDrift(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const rel = '.npmrc';
  if (isAllowed(rel)) return violations;
  if (!(await Bun.file(joinPath(ROOT, rel)).exists())) return violations;

  const text = await Bun.file(joinPath(ROOT, rel)).text();
  for (const { line, raw } of scanRawLines(text)) {
    if (NPMRC_DRIFT_KEYS.test(raw)) {
      violations.push({ file: rel, line, snippet: truncateSnippet(raw), rule: 'npm-client drift' });
    }
  }
  return violations;
}

export type NpmInstallCheckResult = {
  ok: boolean;
  violations: Violation[];
  allowedPaths: string[];
};

export async function runNpmInstallCheck(): Promise<NpmInstallCheckResult> {
  const allowedPaths: string[] = [];
  for (const rel of ALLOW_LIST) {
    if (await Bun.file(joinPath(ROOT, rel)).exists()) {
      allowedPaths.push(rel);
    }
  }

  const violations: Violation[] = [
    ...(await checkWorkflows()),
    ...(await checkPackageScripts()),
    ...(await checkSourceTree()),
    ...(await checkNpmrcDrift()),
  ];

  return { ok: violations.length === 0, violations, allowedPaths };
}

async function main(): Promise<void> {
  const { ok, violations, allowedPaths } = await runNpmInstallCheck();

  if (allowedPaths.length > 0) {
    console.info('Allow-listed paths:', allowedPaths.join(', '));
  }

  if (ok) {
    console.info('✅ No npm/yarn/pnpm install commands in root production paths');
    process.exit(0);
  }

  console.error(`❌ ${violations.length} npm/yarn/pnpm install violation(s) in production paths\n`);
  console.error(
    inspectTable(
      violations.map(v => ({
        file: v.line > 0 ? `${v.file}:${v.line}` : v.file,
        rule: v.rule,
        snippet: v.snippet,
      })),
      ['file', 'rule', 'snippet'],
      { colors: true }
    )
  );
  console.error(
    '\nUse bun install in root production paths. Add intentional exceptions to ALLOW_LIST.'
  );
  process.exit(1);
}

if (import.meta.main) {
  main();
}

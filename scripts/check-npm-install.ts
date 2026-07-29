#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Block non-Bun install commands in root production paths.
 *
 * Nested projects and vendored skills retain their own package-manager policy;
 * this gate owns the root workflows, scripts, tools, libraries, and scripts map.
 */
import { parse } from 'yaml';
import * as ts from 'typescript';
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

function expressionPath(node: ts.Expression): string | null {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) {
    const parent = expressionPath(node.expression);
    return parent ? `${parent}.${node.name.text}` : null;
  }
  return null;
}

function templateCommand(node: ts.TemplateLiteral): string {
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return [node.head.text, ...node.templateSpans.map(span => span.literal.text)].join(' ');
}

function commandArgument(node: ts.Expression | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
    return templateCommand(node);
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements
      .map(element =>
        ts.isStringLiteralLike(element)
          ? element.text
          : ts.isNoSubstitutionTemplateLiteral(element) || ts.isTemplateExpression(element)
            ? templateCommand(element)
            : ' '
      )
      .join(' ');
  }
  return null;
}

function executableCommands(source: string, file: string): Violation[] {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rawLines = source.split('\n');
  const violations: Violation[] = [];
  const spawnPaths = new Set(['Bun.spawn', 'Bun.spawnSync', 'spawn', 'spawnSync']);
  const execPaths = new Set(['exec', 'execSync', 'execFile', 'execFileSync']);
  const tagPaths = new Set(['Bun.$', '$']);

  const add = (node: ts.Node, command: string | null) => {
    if (!command) return;
    const rule = findCommand(command);
    if (!rule) return;
    const line = parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1;
    violations.push({ file, line, rule, snippet: snippet(rawLines[line - 1] ?? command) });
  };

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const path = expressionPath(node.expression);
      if (path && spawnPaths.has(path)) {
        const executable = commandArgument(node.arguments[0]);
        const argumentsList = commandArgument(node.arguments[1]);
        add(node, [executable, argumentsList].filter(Boolean).join(' '));
      } else if (path && execPaths.has(path)) {
        add(node, commandArgument(node.arguments[0]));
      }
    } else if (ts.isTaggedTemplateExpression(node)) {
      const path = expressionPath(node.tag);
      if (path && tagPaths.has(path)) add(node, templateCommand(node.template));
    }
    ts.forEachChild(node, visit);
  };

  visit(parsed);
  return violations;
}

export function findBlockedInstallCommands(
  source: string,
  file = '<source>',
  codeAware = false
): Violation[] {
  if (codeAware) return executableCommands(source, file);
  const rawLines = source.split('\n');
  return source.split('\n').flatMap((line, index) => {
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

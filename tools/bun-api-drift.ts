#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/reference/bun/argv — Bun.argv

import * as ts from 'typescript';
import { relativePath, resolvePath } from '../lib/path-bun.ts';

const SOURCE_GLOB = '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}';
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/i;
const DECLARATION_FILE = /\.d\.[cm]?ts$/i;
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.worktrees',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

export type BunApiDriftOccurrence = {
  member: string;
  file: string;
  line: number;
  column: number;
};

export type BunApiDriftFinding = BunApiDriftOccurrence & {
  occurrences: number;
};

export type BunApiDriftReport = {
  version: 1;
  runtime: {
    bunVersion: string;
    bunRevision: string;
  };
  targets: string[];
  scannedFileCount: number;
  occurrenceCount: number;
  findingCount: number;
  affectedFileCount: number;
  findings: BunApiDriftFinding[];
};

type RuntimeNamespace = Record<string, unknown>;

function scriptKind(file: string): ts.ScriptKind {
  if (/\.tsx$/i.test(file)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(file)) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/i.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function displayPath(file: string, cwd = process.cwd()): string {
  const resolved = resolvePath(file);
  const local = relativePath(resolvePath(cwd), resolved);
  if (local && local !== '..' && !local.startsWith('../')) return local;
  if (!local) return '.';
  return resolved;
}

function ignoredSource(file: string): boolean {
  return (
    DECLARATION_FILE.test(file) ||
    file.split(/[\\/]/).some(part => IGNORED_DIRECTORIES.has(part)) ||
    /\.bundle\.[cm]?js$/i.test(file)
  );
}

export async function resolveBunApiDriftTargets(targets: readonly string[]): Promise<string[]> {
  if (targets.length === 0) throw new Error('at least one explicit scan target is required');
  const files = new Set<string>();

  for (const target of targets) {
    const stat = await Bun.file(target)
      .stat()
      .catch(() => null);
    if (!stat) throw new Error(`scan target does not exist or is unreadable: ${target}`);

    if (stat.isDirectory()) {
      let matched = 0;
      for await (const candidate of new Bun.Glob(SOURCE_GLOB).scan({ cwd: target })) {
        if (ignoredSource(candidate)) continue;
        files.add(resolvePath(target, candidate));
        matched++;
      }
      if (matched === 0) {
        throw new Error(`scan target contains no executable JavaScript/TypeScript: ${target}`);
      }
      continue;
    }

    if (!SOURCE_EXTENSION.test(target) || ignoredSource(target)) {
      throw new Error(
        `unsupported scan target (expected executable JavaScript/TypeScript): ${target}`
      );
    }
    files.add(resolvePath(target));
  }

  return [...files].sort();
}

function createSyntaxContext(
  text: string,
  file: string
): {
  source: ts.SourceFile;
  checker: ts.TypeChecker;
} {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));
  const options: ts.CompilerOptions = {
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const fallback = ts.createCompilerHost(options);
  const host: ts.CompilerHost = {
    ...fallback,
    fileExists: candidate => candidate === file,
    getSourceFile: candidate => (candidate === file ? source : undefined),
    readFile: candidate => (candidate === file ? text : undefined),
    writeFile: () => {},
  };
  const program = ts.createProgram([file], options, host);
  const diagnostic = program.getSyntacticDiagnostics(source)[0];
  if (diagnostic) {
    const location = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
    throw new Error(
      `${displayPath(file)}:${location.line + 1}:${location.character + 1}: ${message}`
    );
  }
  return { source, checker: program.getTypeChecker() };
}

function declaredInSource(
  checker: ts.TypeChecker,
  source: ts.SourceFile,
  identifier: ts.Identifier
): boolean {
  return Boolean(
    checker
      .getSymbolAtLocation(identifier)
      ?.declarations?.some(declaration => declaration.getSourceFile() === source)
  );
}

function isTypeOnlyPosition(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current && !ts.isStatement(current) && !ts.isSourceFile(current)) {
    if (ts.isTypeNode(current)) return true;
    current = current.parent;
  }
  return false;
}

function hasDeclareAncestor(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current && !ts.isSourceFile(current)) {
    if (ts.canHaveModifiers(current)) {
      const modifiers = ts.getModifiers(current);
      if (modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword)) return true;
    }
    current = current.parent;
  }
  return false;
}

function staticMember(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression
): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  const argument = node.argumentExpression;
  if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
    return argument.text;
  }
  return undefined;
}

function staticBunPath(
  expression: ts.Expression,
  checker: ts.TypeChecker,
  source: ts.SourceFile
): string[] | undefined {
  if (ts.isIdentifier(expression)) {
    return expression.text === 'Bun' && !declaredInSource(checker, source, expression)
      ? []
      : undefined;
  }
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'globalThis' &&
    expression.name.text === 'Bun' &&
    !declaredInSource(checker, source, expression.expression)
  ) {
    return [];
  }
  if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) {
    return undefined;
  }
  const parent = staticBunPath(expression.expression, checker, source);
  const member = staticMember(expression);
  return parent && member ? [...parent, member] : undefined;
}

function continuesStaticChain(node: ts.Node): boolean {
  const parent = node.parent;
  return (
    (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
    parent.expression === node
  );
}

function runtimeHasPath(runtime: RuntimeNamespace, path: readonly string[]): boolean {
  if (path[0] === 'env') return Object.prototype.hasOwnProperty.call(runtime, 'env');
  let cursor: unknown = runtime;
  for (const member of path) {
    if (cursor === null || cursor === undefined || !(member in Object(cursor))) {
      return false;
    }
    cursor = (cursor as Record<string, unknown>)[member];
  }
  return true;
}

/** Collect executable static paths that are absent from the running Bun namespace shape. */
export function collectBunApiDriftOccurrences(
  text: string,
  file = 'source.ts',
  runtime: RuntimeNamespace = Bun as RuntimeNamespace
): BunApiDriftOccurrence[] {
  const { source, checker } = createSyntaxContext(text, file);
  const occurrences: BunApiDriftOccurrence[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
      !continuesStaticChain(node) &&
      !isTypeOnlyPosition(node) &&
      !hasDeclareAncestor(node)
    ) {
      const path = staticBunPath(node, checker, source);
      if (path && path.length > 0 && !runtimeHasPath(runtime, path)) {
        const memberStart = ts.isPropertyAccessExpression(node)
          ? node.name.getStart(source)
          : (node.argumentExpression?.getStart(source) ?? node.getStart(source));
        const location = source.getLineAndCharacterOfPosition(memberStart);
        occurrences.push({
          member: path.join('.'),
          file: displayPath(file),
          line: location.line + 1,
          column: location.character + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return occurrences.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.member.localeCompare(right.member)
  );
}

function groupOccurrences(occurrences: readonly BunApiDriftOccurrence[]): BunApiDriftFinding[] {
  const findings = new Map<string, BunApiDriftFinding>();
  for (const occurrence of occurrences) {
    const key = `${occurrence.file}\0${occurrence.member}`;
    const existing = findings.get(key);
    if (existing) {
      existing.occurrences++;
    } else {
      findings.set(key, { ...occurrence, occurrences: 1 });
    }
  }
  return [...findings.values()].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.member.localeCompare(right.member)
  );
}

export async function scanBunApiDrift(
  targets: readonly string[],
  runtime: RuntimeNamespace = Bun as RuntimeNamespace
): Promise<BunApiDriftReport> {
  const files = await resolveBunApiDriftTargets(targets);
  const occurrences: BunApiDriftOccurrence[] = [];
  for (const file of files) {
    occurrences.push(...collectBunApiDriftOccurrences(await Bun.file(file).text(), file, runtime));
  }
  const findings = groupOccurrences(occurrences);
  return {
    version: 1,
    runtime: { bunVersion: Bun.version, bunRevision: Bun.revision },
    targets: [...targets].map(target => displayPath(target)).sort(),
    scannedFileCount: files.length,
    occurrenceCount: occurrences.length,
    findingCount: findings.length,
    affectedFileCount: new Set(findings.map(finding => finding.file)).size,
    findings,
  };
}

function parseMax(raw: string): number {
  if (!/^\d+$/.test(raw)) throw new Error(`--max must be a non-negative integer, received: ${raw}`);
  return Number(raw);
}

function humanReport(report: BunApiDriftReport, max: number): string {
  const lines = report.findings.map(
    finding =>
      `${finding.file}:${finding.line}:${finding.column} Bun.${finding.member} unavailable` +
      (finding.occurrences > 1 ? ` (${finding.occurrences} occurrences)` : '')
  );
  lines.push(
    `Bun API drift: ${report.occurrenceCount} occurrence(s) in ${report.affectedFileCount}/${report.scannedFileCount} file(s); max ${max}; Bun ${report.runtime.bunVersion}`
  );
  return lines.join('\n');
}

export async function runBunApiDriftCli(argv: readonly string[]): Promise<number> {
  let json = false;
  let max = 0;
  const targets: string[] = [];
  for (const argument of argv) {
    if (argument === '--json') json = true;
    else if (argument.startsWith('--max=')) max = parseMax(argument.slice('--max='.length));
    else if (argument === '--help') {
      console.info('Usage: bun tools/bun-api-drift.ts [--json] [--max=N] <paths...>');
      return 0;
    } else if (argument.startsWith('--')) {
      throw new Error(`unknown option: ${argument}`);
    } else targets.push(argument);
  }

  const report = await scanBunApiDrift(targets);
  if (json)
    console.info(
      JSON.stringify({ ...report, max, passed: report.occurrenceCount <= max }, null, 2)
    );
  else console.info(humanReport(report, max));
  return report.occurrenceCount <= max ? 0 : 1;
}

if (import.meta.main) {
  try {
    process.exitCode = await runBunApiDriftCli(Bun.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

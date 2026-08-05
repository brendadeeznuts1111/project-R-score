#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Financial SQL storage guard.
 *
 * New or changed financial columns whose name contains balance, amount, or
 * price may not use REAL, FLOAT, or DOUBLE. SQLite-backed money uses INTEGER
 * minor units; engines that require a decimal declaration use NUMERIC(20,0).
 *
 * Pre-commit scans only added staged lines, so existing debt cannot block an
 * unrelated commit and new debt cannot increase.
 */

export type MoneySqlViolation = {
  file: string;
  line: number;
  column: string;
  sqlType: string;
  text: string;
};

const FINANCIAL_COLUMN_RE = /(balance|amount|price)/i;
const COLUMN_DECLARATION_RE =
  /(?:^\s*|[,(]\s*)["`\[]?([A-Za-z_][A-Za-z0-9_]*)["`\]]?\s+(REAL|FLOAT|DOUBLE(?:\s+PRECISION)?)\b/gi;

/** SQL files plus Bun/TS files that conventionally own embedded DDL. */
export function isMoneySqlScannable(path: string): boolean {
  const normalized = path.replaceAll('\\', '/');
  if (normalized.startsWith('tests/') || normalized.includes('/tests/')) return false;
  if (/\.sql$/i.test(normalized)) return true;
  if (/(^|\/)migrations?\/.*\.(?:ts|js|mts|cts)$/i.test(normalized)) return true;
  return /(^|\/)(?:ledger|schema|migrations?)[^/]*\.(?:ts|js|mts|cts)$/i.test(normalized);
}

function stripSqlLineComment(line: string): string {
  const index = line.indexOf('--');
  return index >= 0 ? line.slice(0, index) : line;
}

export function scanMoneySqlText(
  text: string,
  file = '<input>',
  firstLine = 1
): MoneySqlViolation[] {
  const violations: MoneySqlViolation[] = [];
  for (const [offset, rawLine] of text.split('\n').entries()) {
    const line = stripSqlLineComment(rawLine);
    COLUMN_DECLARATION_RE.lastIndex = 0;
    for (const match of line.matchAll(COLUMN_DECLARATION_RE)) {
      const column = match[1]!;
      if (!FINANCIAL_COLUMN_RE.test(column)) continue;
      violations.push({
        file,
        line: firstLine + offset,
        column,
        sqlType: match[2]!.toUpperCase().replace(/\s+/g, ' '),
        text: rawLine.trim(),
      });
    }
  }
  return violations;
}

export async function stagedMoneySqlViolations(root = process.cwd()): Promise<MoneySqlViolation[]> {
  const proc = Bun.spawn(['git', 'diff', '--cached', '-U0', '--diff-filter=ACMR'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [diff, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`git diff --cached failed: ${stderr.trim() || `exit ${exitCode}`}`);
  }

  const violations: MoneySqlViolation[] = [];
  let file = '';
  let newLine = 0;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ b/')) {
      file = raw.slice('+++ b/'.length);
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      if (file && isMoneySqlScannable(file)) {
        violations.push(...scanMoneySqlText(raw.slice(1), file, newLine));
      }
      newLine++;
      continue;
    }
    if (!raw.startsWith('-')) newLine++;
  }
  return violations;
}

function printViolations(violations: MoneySqlViolation[]): void {
  console.error('❌ money-sql: floating-point financial storage in staged SQL/DDL');
  for (const violation of violations) {
    console.error(
      `   ${violation.file}:${violation.line}  ${violation.column} ${violation.sqlType}`
    );
    console.error(`      ${violation.text}`);
  }
  console.error('   use INTEGER minor units or NUMERIC(20,0) with an explicit currency column');
}

if (import.meta.main) {
  if (!Bun.argv.includes('--staged')) {
    console.error('usage: bun scripts/lint-money-sql.ts --staged');
    process.exit(2);
  }
  const violations = await stagedMoneySqlViolations();
  if (violations.length > 0) {
    printViolations(violations);
    process.exit(1);
  }
  console.info('✅ money-sql: no floating-point financial columns in staged SQL/DDL');
}

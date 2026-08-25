#!/usr/bin/env bun

import { isAbsolute, relative, resolve } from 'node:path';

const SKILL_ROOT = resolve(import.meta.dir, '..');
const DEFAULT_REPO_ROOT = resolve(SKILL_ROOT, '../../..');

export interface MigrationFinding {
  file: string;
  message: string;
  ruleId: string;
  text: string;
  line?: number;
}

export interface ExpectedMigrationFinding {
  file: string;
  ruleId: string;
  textIncludes: string;
}

export interface MigrationRuleSpec {
  id: string;
  paths: string[];
  ruleFile: string;
}

export interface MigrationAuditReport {
  ok: boolean;
  findings: MigrationFinding[];
  expected: MigrationFinding[];
  missingExpected: ExpectedMigrationFinding[];
  unexpected: MigrationFinding[];
}

interface AstGrepFinding {
  file: string;
  message: string;
  range?: { start?: { line?: number } };
  ruleId: string;
  text: string;
}

export const BUN_14_MIGRATION_RULES: readonly MigrationRuleSpec[] = [
  {
    id: 'bun-1.4-no-write-header',
    paths: ['.'],
    ruleFile: 'rules/bun-1.4-no-write-header.yml',
  },
  {
    id: 'bun-1.4-no-recursive-rmdir',
    paths: ['.'],
    ruleFile: 'rules/bun-1.4-no-recursive-rmdir.yml',
  },
  {
    id: 'no-tautological-collection-assertion',
    paths: ['tests'],
    ruleFile: 'rules/no-tautological-collection-assertion.yml',
  },
  {
    id: 'no-ambiguous-exit-code-assertion',
    paths: ['tests'],
    ruleFile: 'rules/no-ambiguous-exit-code-assertion.yml',
  },
] as const;

export const BUN_14_EXPECTED_FINDINGS: readonly ExpectedMigrationFinding[] = [
  {
    file: 'tests/bun-1.4.0-breaking-changes-contract.test.ts',
    ruleId: 'bun-1.4-no-recursive-rmdir',
    textIncludes: '.rmdirSync(',
  },
] as const;

function normalizeFile(file: string, repoRoot: string): string {
  const absolute = isAbsolute(file) ? file : resolve(repoRoot, file);
  return relative(repoRoot, absolute).replaceAll('\\', '/');
}

export function classifyMigrationFindings(
  findings: readonly MigrationFinding[],
  expectedFindings: readonly ExpectedMigrationFinding[] = BUN_14_EXPECTED_FINDINGS
): MigrationAuditReport {
  const remaining = [...findings];
  const expected: MigrationFinding[] = [];
  const missingExpected: ExpectedMigrationFinding[] = [];

  for (const expectedFinding of expectedFindings) {
    const index = remaining.findIndex(
      finding =>
        finding.ruleId === expectedFinding.ruleId &&
        finding.file === expectedFinding.file &&
        finding.text.includes(expectedFinding.textIncludes)
    );
    if (index === -1) {
      missingExpected.push(expectedFinding);
      continue;
    }
    expected.push(remaining[index]!);
    remaining.splice(index, 1);
  }

  return {
    ok: remaining.length === 0 && missingExpected.length === 0,
    findings: [...findings],
    expected,
    missingExpected,
    unexpected: remaining,
  };
}

async function scanRule(
  spec: MigrationRuleSpec,
  repoRoot: string,
  skillRoot: string
): Promise<MigrationFinding[]> {
  const command = [
    resolve(skillRoot, 'scripts/sg.sh'),
    'scan',
    '--rule',
    resolve(skillRoot, spec.ruleFile),
    '--json=compact',
    ...spec.paths,
  ];
  const process = Bun.spawn(command, {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`${spec.id} scan failed (${exitCode}): ${stderr.trim() || stdout.trim()}`);
  }

  const raw = stdout.trim();
  const parsed = raw ? (JSON.parse(raw) as AstGrepFinding[]) : [];
  return parsed.map(finding => ({
    file: normalizeFile(finding.file, repoRoot),
    line: finding.range?.start?.line == null ? undefined : finding.range.start.line + 1,
    message: finding.message,
    ruleId: finding.ruleId,
    text: finding.text,
  }));
}

export async function runBun14MigrationAudit(
  options: {
    repoRoot?: string;
    skillRoot?: string;
  } = {}
): Promise<MigrationAuditReport> {
  const repoRoot = resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const skillRoot = resolve(options.skillRoot ?? SKILL_ROOT);
  const findings = (
    await Promise.all(BUN_14_MIGRATION_RULES.map(spec => scanRule(spec, repoRoot, skillRoot)))
  ).flat();
  return classifyMigrationFindings(findings);
}

export function formatMigrationAudit(report: MigrationAuditReport): string {
  const lines = [
    '# Bun 1.4 migration audit',
    '',
    `- Status: ${report.ok ? 'PASS' : 'FAIL'}`,
    `- Rules: ${BUN_14_MIGRATION_RULES.length}`,
    `- Findings: ${report.findings.length}`,
    `- Expected: ${report.expected.length}`,
    `- Unexpected: ${report.unexpected.length}`,
    `- Missing expected: ${report.missingExpected.length}`,
  ];

  if (report.unexpected.length > 0) {
    lines.push('', '## Unexpected findings', '');
    for (const finding of report.unexpected) {
      lines.push(
        `- \`${finding.ruleId}\` at \`${finding.file}${finding.line ? `:${finding.line}` : ''}\`: ${finding.message}`
      );
    }
  }
  if (report.missingExpected.length > 0) {
    lines.push('', '## Stale expected findings', '');
    for (const finding of report.missingExpected) {
      lines.push(
        `- \`${finding.ruleId}\` at \`${finding.file}\` containing \`${finding.textIncludes}\``
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const report = await runBun14MigrationAudit();
  if (Bun.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(Bun.markdown.ansi(formatMigrationAudit(report)));
  }
  process.exitCode = report.ok ? 0 : 1;
}

if (import.meta.main) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

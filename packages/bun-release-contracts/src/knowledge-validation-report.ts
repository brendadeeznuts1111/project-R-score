import { cliOut, logTable } from '../../../lib/console/index.ts';
import type {
  KnowledgeValidationReport,
  KnowledgeValidationReportFormat,
} from './knowledge-validation-types.ts';

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function junitSuite(report: KnowledgeValidationReport): string {
  const warningFails = report.strict || report.counts.warnings > report.maxWarnings;
  const failures = report.counts.errors + (warningFails ? report.counts.warnings : 0);
  const tests = Math.max(1, report.findings.length);
  const cases =
    report.findings.length === 0
      ? '    <testcase name="validation" classname="BunReleaseKnowledge" />'
      : report.findings
          .map((item, index) => {
            const name = xmlEscape(`${item.rule}:${item.path}`);
            const message = xmlEscape(item.message);
            const failed = item.severity === 'error' || warningFails;
            if (failed) {
              return `    <testcase name="${name}" classname="BunReleaseKnowledge"><failure message="${message}" type="${item.severity}" /></testcase>`;
            }
            return `    <testcase name="${name}" classname="BunReleaseKnowledge"><system-out>${message}</system-out></testcase>`;
          })
          .join('\n');
  return `  <testsuite name="${xmlEscape(report.target)}" tests="${tests}" failures="${failures}" errors="0">\n${cases}\n  </testsuite>`;
}

export function renderKnowledgeValidationJUnit(
  reports: readonly KnowledgeValidationReport[]
): string {
  const tests = reports.reduce((sum, report) => sum + Math.max(1, report.findings.length), 0);
  const failures = reports.reduce((sum, report) => {
    const warningFailures =
      report.strict || report.counts.warnings > report.maxWarnings ? report.counts.warnings : 0;
    return sum + report.counts.errors + warningFailures;
  }, 0);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="Bun release knowledge validation" tests="${tests}" failures="${failures}">\n${reports.map(junitSuite).join('\n')}\n</testsuites>\n`;
}

function writeConsoleReport(report: KnowledgeValidationReport): void {
  cliOut(
    {
      status: report.valid ? 'pass' : 'fail',
      target: report.target,
      version: report.releaseVersion,
      errors: report.counts.errors,
      warnings: report.counts.warnings,
      strict: report.strict,
      maxWarnings: report.maxWarnings,
    },
    { mode: 'compact' }
  );
  if (report.findings.length > 0) {
    logTable(report.findings, ['severity', 'rule', 'path', 'message']);
  }
}

export function writeKnowledgeValidationReports(
  reports: readonly KnowledgeValidationReport[],
  format: KnowledgeValidationReportFormat,
  single: boolean
): void {
  if (format === 'json') {
    cliOut(single ? reports[0] : reports, { json: true });
    return;
  }
  if (format === 'junit') {
    process.stdout.write(renderKnowledgeValidationJUnit(reports));
    return;
  }
  reports.forEach(writeConsoleReport);
}

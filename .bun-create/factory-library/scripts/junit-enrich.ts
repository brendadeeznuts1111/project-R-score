// @see https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/utils#bun-env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
import { readJunitContext, resolveJunitContext } from './junit-context.ts';

const reportPath = Bun.argv[2] ?? 'reports/junit.xml';
const report = Bun.file(reportPath);
if (!(await report.exists())) {
  throw new Error(`JUnit report not found: ${reportPath}. Run bun run test:junit first.`);
}

const pkg = (await Bun.file(new URL('../package.json', import.meta.url)).json()) as {
  name?: string;
  version?: string;
};

function requiredPackageField(value: string | undefined, field: 'name' | 'version'): string {
  const trimmed = value?.trim();
  if (!trimmed)
    throw new Error(`package.json ${field} must be a non-empty string before enriching JUnit.`);
  return trimmed;
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function escapeXmlAttribute(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&apos;',
        '"': '&quot;',
      })[character]!,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function upsertProperties(xml: string, values: Record<string, string>): string {
  const suiteOpen = /<testsuite\b[^>]*>/i.exec(xml);
  if (!suiteOpen || suiteOpen.index === undefined) {
    throw new Error('JUnit report does not contain a testsuite element.');
  }

  const insertionPoint = suiteOpen.index + suiteOpen[0].length;
  const afterSuite = xml.slice(insertionPoint);
  const properties = /<properties\b[^>]*>([\s\S]*?)<\/properties>/i.exec(afterSuite);
  const newProperties = Object.entries(values).map(
    ([name, value]) =>
      `<property name="${escapeXmlAttribute(name)}" value="${escapeXmlAttribute(value)}"/>`,
  );

  if (!properties || properties.index === undefined) {
    return `${xml.slice(0, insertionPoint)}<properties>${newProperties.join('')}</properties>${afterSuite}`;
  }

  let content = properties[1] ?? '';
  for (const [name, value] of Object.entries(values)) {
    const property = `<property name="${escapeXmlAttribute(name)}" value="${escapeXmlAttribute(value)}"/>`;
    const existing = new RegExp(
      `<property\\b(?=[^>]*\\bname=(["'])${escapeRegExp(name)}\\1)[^>]*\\/?\\s*>`,
      'gi',
    );
    content = existing.test(content)
      ? content.replace(existing, property)
      : `${content}${property}`;
  }

  const start = insertionPoint + properties.index;
  const end = start + properties[0].length;
  return `${xml.slice(0, start)}<properties>${content}</properties>${xml.slice(end)}`;
}

const context = (await readJunitContext(reportPath)) ?? (await resolveJunitContext());
const packageName = requiredPackageField(pkg.name, 'name');
const packageVersion = requiredPackageField(pkg.version, 'version');
const projectOverride = optionalText(Bun.env.PROJECT_NAME);
const enriched = upsertProperties(await report.text(), {
  package: packageName,
  package_version: packageVersion,
  project: projectOverride ?? packageName,
  project_source: projectOverride ? 'environment' : 'package',
  report_context: context.reportContext,
  commit_source: context.commitSource,
  branch_source: context.branchSource,
  repository_source: context.repositorySource,
  run_id_source: context.runIdSource,
  generated_at: context.generatedAt,
  ...(context.branch ? { branch: context.branch } : {}),
  ...(context.repository ? { repository: context.repository } : {}),
  ...(context.runId ? { run_id: context.runId } : {}),
});

await Bun.write(reportPath, enriched);
console.log(`Enriched JUnit report: ${reportPath}`);

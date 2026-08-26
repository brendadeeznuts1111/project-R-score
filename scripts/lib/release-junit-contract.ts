// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @released Bun.XML.parse · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/runtime/xml — Bun.XML

import { isRecord } from './release-target-contract.ts';

export interface JunitSummary {
  suites: number;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  commit: string;
}

function counter(record: Record<string, unknown>, name: string): number | undefined {
  const raw = record[`@${name}`];
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw))
    throw new Error(`JUnit ${name} must be a non-negative integer`);
  return Number(raw);
}

export function validateJunitXml(
  xml: string,
  expectedCommit?: string,
  expectedFiles: string[] = []
): JunitSummary {
  let document: unknown;
  try {
    document = Bun.XML.parse(xml);
  } catch (error) {
    throw new Error(`invalid JUnit XML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(document) || (!('testsuites' in document) && !('testsuite' in document)))
    throw new Error('JUnit XML must have a testsuites or testsuite root');
  const suites: Record<string, unknown>[] = [];
  const commits: string[] = [];
  const parseNode = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(parseNode);
    if (!isRecord(node)) return;
    if ('@tests' in node || '@failures' in node || '@errors' in node) suites.push(node);
    if (node['@name'] === 'commit' && typeof node['@value'] === 'string')
      commits.push(node['@value']);
    if ('failure' in node || 'error' in node)
      throw new Error('JUnit report contains a failure or error element');
    Object.values(node).forEach(parseNode);
  };
  parseNode(document);
  if (!suites.length) throw new Error('JUnit XML has no suite counters');
  const leaves = suites.filter(suite => !('testsuite' in suite));
  const counted = leaves.length ? leaves : suites;
  const files = [
    ...new Set(
      suites.map(suite => suite['@file']).filter((file): file is string => typeof file === 'string')
    ),
  ].sort();
  if (expectedFiles.length && JSON.stringify(files) !== JSON.stringify([...expectedFiles].sort()))
    throw new Error('JUnit suite files do not match the release target');
  const commit = [...new Set(commits)][0];
  if (!commit || new Set(commits).size !== 1)
    throw new Error('JUnit XML must contain exactly one commit property value');
  if (expectedCommit && commit !== expectedCommit)
    throw new Error(`JUnit commit ${commit} does not match current HEAD ${expectedCommit}`);
  for (const suite of suites) {
    const failures = counter(suite, 'failures') ?? 0;
    const errors = counter(suite, 'errors') ?? 0;
    if (failures || errors)
      throw new Error(`JUnit report is not clean: failures=${failures}, errors=${errors}`);
  }
  for (const suite of counted) {
    if (counter(suite, 'tests') === undefined)
      throw new Error('JUnit counted suites must declare tests');
    if (counter(suite, 'failures') === undefined)
      throw new Error('JUnit counted suites must declare failures');
  }
  const summary = counted.reduce<JunitSummary>(
    (total, suite) => ({
      suites: total.suites + 1,
      tests: total.tests + (counter(suite, 'tests') ?? 0),
      failures: total.failures + (counter(suite, 'failures') ?? 0),
      errors: total.errors + (counter(suite, 'errors') ?? 0),
      skipped: total.skipped + (counter(suite, 'skipped') ?? 0),
      commit,
    }),
    { suites: 0, tests: 0, failures: 0, errors: 0, skipped: 0, commit }
  );
  if (!summary.tests || summary.tests <= summary.skipped)
    throw new Error(
      `JUnit report must execute at least one non-skipped test: tests=${summary.tests}, skipped=${summary.skipped}`
    );
  return summary;
}

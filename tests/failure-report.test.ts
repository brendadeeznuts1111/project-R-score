// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildFailuresReport,
  failuresFromJunitXml,
  namePattern,
} from '../lib/failure-report.ts';

const JUNIT = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="3" assertions="10" failures="1" skipped="1" time="2.5">
  <testsuite name="tests/foo.test.ts" file="tests/foo.test.ts" tests="3" failures="1" time="0">
    <testcase name="passes fine" classname="foo" time="0.001" file="tests/foo.test.ts" />
    <testcase name="breaks &lt;badly&gt; (with regex+chars)" classname="foo" time="0.002" file="tests/foo.test.ts">
      <failure message="expect(received).toBe(expected)">Expected: 2
Received: 3 &amp; more</failure>
    </testcase>
    <testcase name="skipped one" classname="foo" time="0" file="tests/foo.test.ts">
      <skipped />
    </testcase>
  </testsuite>
</testsuites>`;

describe('test-failures parser', () => {
  test('extracts only failing cases with replay commands', () => {
    const r = failuresFromJunitXml(JUNIT);
    expect(r.tests).toBe(3);
    expect(r.failureCount).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.failures).toHaveLength(1);
    const f = r.failures[0]!;
    expect(f.file).toBe('tests/foo.test.ts');
    expect(f.name).toBe('breaks <badly> (with regex+chars)');
    expect(f.message).toContain('Received: 3 & more');
    expect(f.replayFile).toBe('bun test tests/foo.test.ts');
    expect(f.replayTest).toContain('--test-name-pattern');
    expect(f.replayTest).toContain('breaks <badly>');
  });

  test('namePattern escapes regex characters', () => {
    expect(namePattern('a.b(c)+d')).toBe('a\\.b\\(c\\)\\+d');
  });

  test('no failures → healthy empty report', () => {
    const r = failuresFromJunitXml(
      '<testsuites tests="1" failures="0" skipped="0" time="0.1"><testsuite name="x"><testcase name="ok" file="a.test.ts" time="0" /></testsuite></testsuites>'
    );
    expect(r.failures).toHaveLength(0);
  });

  test('buildFailuresReport merges multiple docs and sorts', () => {
    const report = buildFailuresReport(
      [
        { source: 'b.xml', xml: JUNIT },
        {
          source: 'a.xml',
          xml: '<testsuites tests="1" failures="0" skipped="0" time="0.1"><testsuite name="y"><testcase name="ok" file="a.test.ts" time="0" /></testsuite></testsuites>',
        },
      ],
      '2026-07-28T00:00:00Z'
    );
    expect(report.sources).toEqual(['b.xml', 'a.xml']);
    expect(report.totals.tests).toBe(4);
    expect(report.totals.failures).toBe(1);
    expect(report.healthy).toBe(false);
    expect(report.generatedAt).toBe('2026-07-28T00:00:00Z');
  });

  test('report shape is a stable contract (snapshot)', () => {
    const report = buildFailuresReport([{ source: 'junit.xml', xml: JUNIT }], '2026-07-28T00:00:00Z');
    expect(report).toMatchSnapshot();
  });
});

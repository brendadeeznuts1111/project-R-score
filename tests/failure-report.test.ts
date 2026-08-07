// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildFailuresReport,
  FAILURES_STALE_MS,
  failuresFromJunitXml,
  isFailuresReportStale,
  namePattern,
  parseJunitProvenance,
} from '../lib/failure-report.ts';
import { renderHtml, renderProvenance } from '../tools/failures-bake.ts';

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
    // Without mtimes, sourceAt falls back to bake time
    expect(report.sourceAt).toBe('2026-07-28T00:00:00Z');
  });

  test('sourceAt prefers max JUnit mtime over bake wall-clock', () => {
    const report = buildFailuresReport(
      [
        {
          source: 'old.xml',
          xml: JUNIT,
          mtimeMs: Date.parse('2026-07-01T00:00:00Z'),
        },
        {
          source: 'new.xml',
          xml: '<testsuites tests="0" failures="0" skipped="0" time="0"></testsuites>',
          mtimeMs: Date.parse('2026-07-20T12:00:00Z'),
        },
      ],
      '2026-08-04T00:00:00Z'
    );
    expect(report.generatedAt).toBe('2026-08-04T00:00:00Z');
    expect(report.sourceAt).toBe('2026-07-20T12:00:00.000Z');
    // Fresh bake of old suite is still stale vs source
    expect(
      isFailuresReportStale(report, Date.parse('2026-08-04T00:00:00Z'), FAILURES_STALE_MS)
    ).toBe(true);
  });

  test('isFailuresReportStale is false for recent sourceAt', () => {
    const now = Date.parse('2026-08-04T12:00:00Z');
    expect(
      isFailuresReportStale(
        { sourceAt: '2026-08-04T11:00:00Z', generatedAt: '2026-08-04T12:00:00Z' },
        now,
        FAILURES_STALE_MS
      )
    ).toBe(false);
  });

  test('report shape is a stable contract (snapshot)', () => {
    const report = buildFailuresReport([{ source: 'junit.xml', xml: JUNIT }], '2026-07-28T00:00:00Z');
    expect(report).toMatchSnapshot();
  });

  test('renderHtml embeds sourceAt and stale-board guard using STALE_MS', () => {
    const report = buildFailuresReport(
      [{ source: 'junit.xml', xml: JUNIT, mtimeMs: Date.parse('2026-07-01T00:00:00Z') }],
      '2026-08-04T00:00:00Z'
    );
    const html = renderHtml(report);
    expect(html).toContain('id="tf-stale-banner"');
    expect(html).toContain('id="test-failures-embed"');
    expect(html).toContain(`const STALE_MS = ${FAILURES_STALE_MS}`);
    expect(html).toContain('report.sourceAt || report.generatedAt');
    expect(html).toContain('"sourceAt":"2026-07-01T00:00:00.000Z"');
    expect(html).toContain('Stale green board');
    // Always alarm styling — no soft green class for stale+healthy
    expect(html).not.toContain('tf-stale.ok');
    // Escaping: failure message with < is escaped in table
    expect(html).toContain('breaks &lt;badly&gt;');
  });

  test('parseJunitProvenance reads ci/commit/hostname from <properties>', () => {
    const xml = `<testsuites tests="1"><testsuite>
      <properties>
        <property name="ci" value="https://github.com/o/r/actions/runs/42" />
        <property name="commit" value="abc123def456" />
        <property name="hostname" value="runner-01" />
      </properties>
      <testcase name="ok" file="a.test.ts" />
    </testsuite></testsuites>`;
    expect(parseJunitProvenance(xml)).toEqual({
      ci: 'https://github.com/o/r/actions/runs/42',
      commit: 'abc123def456',
      hostname: 'runner-01',
    });
    // absent block → {}
    expect(parseJunitProvenance('<testsuites/>')).toEqual({});
    // unknown properties ignored
    expect(parseJunitProvenance('<properties><property name="other" value="x"/></properties>')).toEqual({});
  });

  test('failuresFromJunitXml + buildFailuresReport surface provenance', () => {
    const xml = `<testsuites tests="1" failures="1" time="1">
      <testsuite name="s"><properties>
        <property name="ci" value="https://ci.example/job/7" />
        <property name="commit" value="deadbeef" />
      </properties>
      <testcase name="bad" file="b.test.ts"><failure>boom</failure></testcase></testsuite>
    </testsuites>`;
    const parsed = failuresFromJunitXml(xml);
    expect(parsed.provenance).toEqual({ ci: 'https://ci.example/job/7', commit: 'deadbeef' });

    const report = buildFailuresReport([{ source: 'junit.xml', xml }]);
    expect(report.provenance).toEqual({ ci: 'https://ci.example/job/7', commit: 'deadbeef' });
    // provenance absent when no <properties>
    expect(buildFailuresReport([{ source: 'x', xml: '<testsuites/>' }]).provenance).toBeUndefined();
  });

  test('renderProvenance renders chips and escapes values', () => {
    const html = renderProvenance({ ci: 'https://ci.example/job/1', commit: 'deadbeef1234', hostname: 'h1' });
    expect(html).toContain('ci');
    expect(html).toContain('https://ci.example/job/1');
    expect(html).toContain('deadbeef1234');
    expect(html).toContain('h1');
    const escaped = renderProvenance({ ci: 'https://x.test/a?q=<b>&amp;' });
    expect(escaped).not.toContain('<b>');
  });
});

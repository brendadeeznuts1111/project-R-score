/**
 * Test failures — parse Bun JUnit XML into a portal-ready failure report with
 * per-failure dev replay commands.
 *
 * Pure module (no fs) — the bake CLI supplies XML strings.
 * JUnit input comes from: bun test --reporter=junit --reporter-outfile=tmp/junit*.xml
 */

export type TestFailure = {
  file: string;
  suite: string;
  name: string;
  timeSeconds: number;
  message: string;
  /** Ready-to-run replay commands for developers. */
  replayFile: string;
  replayTest: string;
};

export type TestFailuresReport = {
  kind: 'test-failures';
  generatedAt: string;
  sources: string[];
  totals: { tests: number; failures: number; skipped: number; timeSeconds: number };
  failures: TestFailure[];
  healthy: boolean;
};

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/(\w[\w-]*)="([^"]*)"/g)) {
    out[m[1]!] = unescapeXml(m[2]!);
  }
  return out;
}

/** Short test-name pattern for --test-name-pattern (regex-special chars escaped). */
export function namePattern(name: string): string {
  const trimmed = name.slice(0, 48).trim();
  return trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Parse one JUnit XML document into failures (testcase elements containing <failure>). */
export function failuresFromJunitXml(xml: string): {
  failures: TestFailure[];
  tests: number;
  failureCount: number;
  skipped: number;
  timeSeconds: number;
} {
  const failures: TestFailure[] = [];
  // <testcase ...> is either self-closing or has children — only those with <failure matter.
  const caseRe = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const m of xml.matchAll(caseRe)) {
    const body = m[2] ?? '';
    if (!body.includes('<failure')) continue;
    const a = attrs(m[1]!);
    const failBody = body.match(/<failure\b[^>]*>([\s\S]*?)<\/failure>/);
    const message = unescapeXml((failBody?.[1] ?? '').trim()).slice(0, 500);
    const file = a.file ?? a.classname ?? 'unknown';
    const name = a.name ?? 'unknown';
    failures.push({
      file,
      suite: a.classname ?? '',
      name,
      timeSeconds: Number(a.time ?? 0),
      message,
      replayFile: `bun test ${file}`,
      replayTest: `bun test ${file} --test-name-pattern "${namePattern(name)}"`,
    });
  }
  // totals from the outer <testsuites> tag
  const root = xml.match(/<testsuites\b([^>]*)>/);
  const ra = root ? attrs(root[1]!) : {};
  return {
    failures,
    tests: Number(ra.tests ?? 0),
    failureCount: Number(ra.failures ?? failures.length),
    skipped: Number(ra.skipped ?? 0),
    timeSeconds: Number(ra.time ?? 0),
  };
}

/** Merge failures from multiple JUnit documents into one report. */
export function buildFailuresReport(
  docs: { source: string; xml: string }[],
  generatedAt = new Date().toISOString()
): TestFailuresReport {
  const all: TestFailure[] = [];
  let tests = 0,
    skipped = 0,
    timeSeconds = 0;
  for (const d of docs) {
    const r = failuresFromJunitXml(d.xml);
    all.push(...r.failures);
    tests += r.tests;
    skipped += r.skipped;
    timeSeconds += r.timeSeconds;
  }
  all.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));
  return {
    kind: 'test-failures',
    generatedAt,
    sources: docs.map(d => d.source),
    totals: {
      tests,
      failures: all.length,
      skipped,
      timeSeconds: Math.round(timeSeconds * 1000) / 1000,
    },
    failures: all,
    healthy: all.length === 0,
  };
}

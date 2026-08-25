// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @updated Bun.Glob · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.Glob · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.Glob · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated Bun.Glob · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.Glob · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.Glob · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.Glob · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.Glob · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.Glob · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.Glob · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/glob#quickstart
const TEST_CONSOLE_CALL =
  /\bconsole\.(log|info|warn|error|debug|table|dir|trace|assert|time|timeEnd|timeLog|group|groupEnd|groupCollapsed|count|countReset|clear|profile|profileEnd)\s*\(/;
const TEST_CONSOLE_ALLOW = /\/\/\s*test-console-ok:\s*(\S.*)$/;

export type TestConsoleCall = {
  file: string;
  line: number;
  method: string;
  text: string;
  allowReason?: string;
  invalidAllowReason?: string;
};

export type TestConsoleBaselineEntry = {
  file: string;
  count: number;
  reason: string;
};

export type TestConsoleBaseline = {
  schemaVersion: 1;
  entries: TestConsoleBaselineEntry[];
};

/** Keep one-word acknowledgements from turning into a blanket exemption. */
export function isSpecificTestConsoleReason(reason: string): boolean {
  return reason.trim().length >= 16 && reason.trim().split(/\s+/).length >= 3;
}

/** Scan actual test call sites; quoted fixture source and comments are ignored. */
export function scanTestConsoleSource(file: string, text: string): TestConsoleCall[] {
  const calls: TestConsoleCall[] = [];
  let inTemplate = false;
  let inBlockComment = false;
  for (const [index, raw] of text.split('\n').entries()) {
    let code = '';
    let inString: string | null = null;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]!;
      const next = raw[i + 1];
      const prev = raw[i - 1];
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (inTemplate) {
        if (ch === '`' && prev !== '\\') inTemplate = false;
        continue;
      }
      if (inString) {
        if (ch === inString && prev !== '\\') inString = null;
        continue;
      }
      if (ch === '/' && next === '/') break;
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === '`') {
        inTemplate = true;
        continue;
      }
      if (ch === "'" || ch === '"') {
        inString = ch;
        continue;
      }
      code += ch;
    }
    const match = TEST_CONSOLE_CALL.exec(code);
    if (!match) continue;
    const marker = TEST_CONSOLE_ALLOW.exec(raw);
    const markerReason = marker?.[1]?.trim();
    calls.push({
      file,
      line: index + 1,
      method: match[1]!,
      text: raw.trim(),
      ...(markerReason && isSpecificTestConsoleReason(markerReason)
        ? { allowReason: markerReason }
        : markerReason
          ? { invalidAllowReason: markerReason }
          : {}),
    });
  }
  return calls;
}

export function summarizeLegacyTestConsole(calls: TestConsoleCall[]): Map<string, number> {
  const summary = new Map<string, number>();
  for (const call of calls) {
    if (call.allowReason) continue;
    summary.set(call.file, (summary.get(call.file) ?? 0) + 1);
  }
  return summary;
}

export function validateTestConsoleBaseline(
  calls: TestConsoleCall[],
  baseline: TestConsoleBaseline
): string[] {
  const failures: string[] = [];
  const expected = new Map<string, number>();
  for (const call of calls) {
    if (call.invalidAllowReason) {
      failures.push(`${call.file}:${call.line} test-console-ok needs a specific reason`);
    }
  }
  for (const entry of baseline.entries) {
    if (!entry.file || !Number.isInteger(entry.count) || entry.count < 1) {
      failures.push(`invalid baseline entry for ${entry.file || '(missing file)'}`);
      continue;
    }
    if (!entry.reason.trim() || entry.reason.startsWith('TODO:')) {
      failures.push(`baseline entry ${entry.file} needs a specific non-TODO reason`);
      continue;
    }
    if (expected.has(entry.file)) failures.push(`baseline has duplicate entry for ${entry.file}`);
    expected.set(entry.file, entry.count);
  }
  const actual = summarizeLegacyTestConsole(calls);
  for (const [file, count] of actual) {
    const allowed = expected.get(file) ?? 0;
    if (count > allowed) {
      failures.push(
        `${file}: ${count} unannotated direct console call(s), baseline allows ${allowed}`
      );
    }
  }
  return failures;
}

export function buildTestConsoleBaselineCandidate(calls: TestConsoleCall[]): TestConsoleBaseline {
  return {
    schemaVersion: 1,
    entries: [...summarizeLegacyTestConsole(calls)]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, count]) => ({
        file,
        count,
        reason: 'TODO: explain why this legacy test requires direct console output',
      })),
  };
}

export async function scanTestConsole(root: string): Promise<TestConsoleCall[]> {
  const calls: TestConsoleCall[] = [];
  for (const suffix of ['test.ts', 'spec.ts']) {
    const glob = new Bun.Glob(`tests/**/*.${suffix}`);
    for await (const file of glob.scan({ cwd: root })) {
      calls.push(...scanTestConsoleSource(file, await Bun.file(`${root}/${file}`).text()));
    }
  }
  return calls;
}

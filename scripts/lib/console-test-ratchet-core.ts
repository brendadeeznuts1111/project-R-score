export type TestConsoleCall = {
  file: string;
  line: number;
  method: string;
  text: string;
  allowReason?: string;
  invalidAllowReason?: string;
};

export type TestConsoleBaselineEntry = { file: string; count: number; reason: string };
export type TestConsoleBaseline = { schemaVersion: 1; entries: TestConsoleBaselineEntry[] };

const TEST_CONSOLE_CALL =
  /\bconsole\.(log|info|warn|error|debug|table|dir|trace|assert|time|timeEnd|timeLog|group|groupEnd|groupCollapsed|count|countReset|clear|profile|profileEnd)\s*\(/;
const TEST_CONSOLE_ALLOW = /\/\/\s*test-console-ok:\s*(\S.*)$/;

export function isSpecificTestConsoleReason(reason: string): boolean {
  return reason.trim().length >= 16 && reason.trim().split(/\s+/).length >= 3;
}

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
    const markerReason = TEST_CONSOLE_ALLOW.exec(raw)?.[1]?.trim();
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
  for (const call of calls)
    if (!call.allowReason) summary.set(call.file, (summary.get(call.file) ?? 0) + 1);
  return summary;
}

export function validateTestConsoleBaseline(
  calls: TestConsoleCall[],
  baseline: TestConsoleBaseline
): string[] {
  const failures: string[] = [];
  const expected = new Map<string, number>();
  for (const call of calls)
    if (call.invalidAllowReason)
      failures.push(`${call.file}:${call.line} test-console-ok needs a specific reason`);
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
  for (const [file, count] of summarizeLegacyTestConsole(calls)) {
    const allowed = expected.get(file) ?? 0;
    if (count > allowed)
      failures.push(
        `${file}: ${count} unannotated direct console call(s), baseline allows ${allowed}`
      );
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

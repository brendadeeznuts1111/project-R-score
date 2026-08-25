// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildTestConsoleBaselineCandidate,
  isSpecificTestConsoleReason,
  scanTestConsoleSource,
  validateTestConsoleBaseline,
  type TestConsoleBaseline,
} from '../scripts/lint-console-format.ts';

const baseline = (entries: TestConsoleBaseline['entries']): TestConsoleBaseline => ({
  schemaVersion: 1,
  entries,
});

describe('test direct-console ratchet', () => {
  test('finds direct calls but ignores fixture strings, comments, and marked calls', () => {
    const calls = scanTestConsoleSource(
      'tests/example.test.ts',
      [
        'console.warn("real");',
        'const fixture = "console.error(\\\"not real\\\")";',
        '// console.log("not real")',
        'console.error(problem); // test-console-ok: prints child output on assertion failure',
      ].join('\n')
    );

    expect(calls).toEqual([
      { file: 'tests/example.test.ts', line: 1, method: 'warn', text: 'console.warn("real");' },
      {
        file: 'tests/example.test.ts',
        line: 4,
        method: 'error',
        text: 'console.error(problem); // test-console-ok: prints child output on assertion failure',
        allowReason: 'prints child output on assertion failure',
      },
    ]);
  });

  test('rejects unannotated additions and invalid baseline reasons', () => {
    const calls = scanTestConsoleSource('tests/example.test.ts', 'console.error(problem);');
    expect(validateTestConsoleBaseline(calls, baseline([]))).toEqual([
      'tests/example.test.ts: 1 unannotated direct console call(s), baseline allows 0',
    ]);
    expect(
      validateTestConsoleBaseline(
        [],
        baseline([{ file: 'tests/example.test.ts', count: 1, reason: 'TODO: add a reason' }])
      )
    ).toEqual(['baseline entry tests/example.test.ts needs a specific non-TODO reason']);
  });

  test('allows specifically annotated new calls without growing legacy allowance', () => {
    const calls = scanTestConsoleSource(
      'tests/example.test.ts',
      'console.error(problem); // test-console-ok: prints child output on assertion failure'
    );
    expect(validateTestConsoleBaseline(calls, baseline([]))).toEqual([]);
    expect(isSpecificTestConsoleReason('debug')).toBe(false);
    const vague = scanTestConsoleSource(
      'tests/example.test.ts',
      'console.error(problem); // test-console-ok: debug'
    );
    expect(validateTestConsoleBaseline(vague, baseline([]))).toEqual([
      'tests/example.test.ts:1 test-console-ok needs a specific reason',
      'tests/example.test.ts: 1 unannotated direct console call(s), baseline allows 0',
    ]);
  });

  test('candidate workflow is review-only because generated entries retain TODO reasons', () => {
    const calls = scanTestConsoleSource('tests/example.test.ts', 'console.warn(problem);');
    expect(buildTestConsoleBaselineCandidate(calls)).toEqual(
      baseline([
        {
          file: 'tests/example.test.ts',
          count: 1,
          reason: 'TODO: explain why this legacy test requires direct console output',
        },
      ])
    );
  });
});

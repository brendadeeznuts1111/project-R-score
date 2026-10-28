// @see https://bun.com/docs/test/writing-tests
import { expect, test } from 'bun:test';
import { selectCiReportExitCode } from '../scripts/run-test-ci-report.ts';

test('CI report wrapper never masks the test process status', () => {
  expect(selectCiReportExitCode(17, 0)).toBe(17);
  expect(selectCiReportExitCode(17, 9)).toBe(17);
  expect(selectCiReportExitCode(0, 9)).toBe(9);
  expect(selectCiReportExitCode(0, 0)).toBe(0);
});

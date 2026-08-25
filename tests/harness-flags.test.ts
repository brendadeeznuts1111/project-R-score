import { describe, expect, test } from 'bun:test';
import { applyHarnessUnknownLongOptionGuardFor } from '../lib/docs/flags/harness.ts';

describe('harness flag leaf', () => {
  test('keeps known options and strips unknown options only with the explicit policy', () => {
    expect(applyHarnessUnknownLongOptionGuardFor('ci:harness', ['--fast'])).toEqual(['--fast']);
    expect(
      applyHarnessUnknownLongOptionGuardFor('test:changed', ['--bogus', '--parallel=4'], {
        BUN_STRIP_UNKNOWN: 'true',
      })
    ).toEqual(['--parallel=4']);
  });
});

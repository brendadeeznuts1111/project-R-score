import { describe, expect, test } from 'bun:test';
import {
  applyReleaseUnknownLongOptionGuardFor,
  BUN_RELEASE_CONTRACTS_ALLOWED_LONG,
  BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG,
  BUN_RUNTIME_PIN_ALLOWED_LONG,
  checkReleaseUnknownLongOptions,
} from '../lib/docs/flags/release.ts';

describe('release CLI flag leaf', () => {
  test('owns only the release/runtime command allowlists', () => {
    expect(BUN_RELEASE_CONTRACTS_ALLOWED_LONG).toContain('output-dir');
    expect(BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG).toContain('max-warnings');
    expect(BUN_RUNTIME_PIN_ALLOWED_LONG).toEqual(['json']);
  });

  test('preserves unknown-option stripping and help aliases', () => {
    expect(
      checkReleaseUnknownLongOptions(
        ['--typo=1', '--json', '--help'],
        BUN_RUNTIME_PIN_ALLOWED_LONG,
        { BUN_STRIP_UNKNOWN: 'true' }
      )
    ).toMatchObject({ argv: ['--json', '--help'], unknown: ['typo'], stripUnknown: true });
  });

  test('throws on an unknown release option when requested', () => {
    expect(() =>
      applyReleaseUnknownLongOptionGuardFor('bun:runtime-pin', ['--typo'], {
        onFail: 'throw',
        env: {},
      })
    ).toThrow('unknown flag(s): --typo');
  });
});

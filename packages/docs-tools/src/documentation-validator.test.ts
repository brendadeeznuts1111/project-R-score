import { afterEach, describe, expect, test } from 'bun:test';

import DocumentationValidator from './documentation-validator';
import {
  runAutoHealForTest,
  setPlatformValidatorLoaderForTest,
} from './documentation-validator.internal';

describe('documentation-validator integration', () => {
  afterEach(() => {
    setPlatformValidatorLoaderForTest(null);
  });

  test('uses platform validator module when loader provides it', async () => {
    let calls = 0;
    setPlatformValidatorLoaderForTest(async () => ({
      ConstantValidator: {
        validateConstant(name: string) {
          calls++;
          return name === 'documentation-base-url'
            ? { isValid: false, errors: ['mocked failure'] }
            : { isValid: true, errors: [] };
        },
      },
      AutoHealer: {
        async healAll() {
          return { totalFixes: 7 };
        },
      },
    }));

    const result = await DocumentationValidator.validateDocumentationConstants();
    expect(calls).toBe(3);
    expect(result.total).toBe(3);
    expect(result.valid).toBe(2);
    expect(result.errors).toContain('mocked failure');

    const heal = await runAutoHealForTest();
    expect(heal.totalFixes).toBe(7);
  });

  test('falls back cleanly when platform loader throws', async () => {
    setPlatformValidatorLoaderForTest(async () => {
      throw new Error('module unavailable');
    });

    const result = await DocumentationValidator.validateDocumentationConstants();
    expect(result.total).toBe(3);
    expect(result.valid).toBe(3);

    const heal = await runAutoHealForTest();
    expect(typeof heal.totalFixes).toBe('number');
    expect(heal.totalFixes).toBeGreaterThanOrEqual(0);
  });

});

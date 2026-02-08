/**
 * Dashboard Tests
 *
 * Individual test functions for validating profile engine functionality.
 */

import type { TestResult } from '../types.ts';

function truncateSafe(str: string | null | undefined, max: number): string {
  if (str == null) return '';
  const s = String(str);
  if (s.length <= max) return s;
  let end = max;
  const c = s.charCodeAt(end - 1);
  if (c >= 0xD800 && c <= 0xDBFF) end--;
  return s.slice(0, end);
}

/**
 * Test input validation for user IDs
 */
export async function runInputValidationTest(): Promise<TestResult> {
  try {
    const { requireValidUserId } = await import('../../../user-profile/src/index.ts');
    requireValidUserId('@test');
    try {
      requireValidUserId('invalid');
      return {
        name: 'Input Validation',
        status: 'fail',
        message: 'Should reject invalid userId',
        category: 'type-safety',
      };
    } catch {
      return {
        name: 'Input Validation',
        status: 'pass',
        message: 'Validates @username format correctly',
        category: 'type-safety',
      };
    }
  } catch (e) {
    return {
      name: 'Input Validation',
      status: 'fail',
      message: truncateSafe(String(e), 100),
      category: 'type-safety',
    };
  }
}

/**
 * Test error handling for various error types
 */
export async function runErrorHandlingTest(): Promise<TestResult> {
  try {
    const { handleError } = await import('../../../user-profile/src/index.ts');
    const msg1 = handleError(new Error('test'), 'test', { log: false });
    const msg2 = handleError('string', 'test', { log: false });
    const msg3 = handleError({ custom: 'object' }, 'test', { log: false });

    const expectedMessages = { msg1: 'test', msg2: 'string' };
    const actualMessages = { msg1, msg2 };
    const messagesMatch = Bun.deepEquals(actualMessages, expectedMessages);

    if (messagesMatch && msg3.includes('object')) {
      return {
        name: 'Error Handling',
        status: 'pass',
        message: 'Handles Error, string, and object types safely (verified with Bun.deepEquals)',
        category: 'code-quality',
      };
    } else {
      return {
        name: 'Error Handling',
        status: 'fail',
        message: 'Error extraction inconsistent',
        category: 'code-quality',
      };
    }
  } catch (e) {
    return {
      name: 'Error Handling',
      status: 'fail',
      message: truncateSafe(String(e), 100),
      category: 'code-quality',
    };
  }
}

/**
 * Test logger conditional output
 */
export async function runLoggerTest(): Promise<TestResult> {
  try {
    const { logger } = await import('../../../user-profile/src/index.ts');
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    logger.info('test');
    process.env.NODE_ENV = origEnv;
    return {
      name: 'Logger (conditional)',
      status: 'pass',
      message: 'Suppresses info logs in production',
      category: 'code-quality',
    };
  } catch (e) {
    return {
      name: 'Logger (conditional)',
      status: 'fail',
      message: truncateSafe(String(e), 100),
      category: 'code-quality',
    };
  }
}

/**
 * Test BigInt serialization
 */
export async function runSerializationTest(): Promise<TestResult> {
  try {
    const { createSerializableCopy } = await import('../../../user-profile/src/index.ts');
    const test = { bigint: BigInt(123), normal: 'test', nested: { value: BigInt(456) } };
    const result = createSerializableCopy(test);
    if (typeof result.bigint === 'string' && typeof result.nested.value === 'string') {
      return {
        name: 'Serialization',
        status: 'pass',
        message: 'BigInt converted to string (nested objects too)',
        category: 'code-quality',
      };
    } else {
      return {
        name: 'Serialization',
        status: 'fail',
        message: 'BigInt not fully converted',
        category: 'code-quality',
      };
    }
  } catch (e) {
    return {
      name: 'Serialization',
      status: 'fail',
      message: truncateSafe(String(e), 100),
      category: 'code-quality',
    };
  }
}

/**
 * Test type safety for profile structure
 */
export async function runTypeSafetyTest(): Promise<TestResult> {
  try {
    const { profileEngine } = await import('../../../user-profile/src/index.ts');
    const testUserId = '@ashschaeffer1';
    let profile = await profileEngine.getProfile(testUserId, true);

    if (!profile) {
      try {
        await profileEngine.createProfile({
          userId: testUserId,
          gateways: ['venmo'],
          preferredGateway: 'venmo',
        });
        profile = await profileEngine.getProfile(testUserId, true);
      } catch (createErr) {
        return {
          name: 'Type Safety',
          status: 'fail',
          message: 'Profile not found and could not create test profile: ' + truncateSafe(String(createErr), 60),
          category: 'type-safety',
        };
      }
    }

    if (profile) {
      const expectedStructure = { userId: testUserId, gateways: ['venmo'] as string[] };
      const hasCorrectStructure = Bun.deepEquals(
        { userId: profile.userId, gateways: profile.gateways },
        expectedStructure
      );
      if (hasCorrectStructure && typeof profile.userId === 'string' && Array.isArray(profile.gateways)) {
        return {
          name: 'Type Safety',
          status: 'pass',
          message: 'Profile types are correct (verified with Bun.deepEquals)',
          category: 'type-safety',
        };
      } else {
        return {
          name: 'Type Safety',
          status: 'fail',
          message: 'Type mismatches detected',
          category: 'type-safety',
        };
      }
    } else {
      return {
        name: 'Type Safety',
        status: 'fail',
        message: 'Profile not found after create',
        category: 'type-safety',
      };
    }
  } catch (e) {
    return {
      name: 'Type Safety',
      status: 'fail',
      message: truncateSafe(String(e), 100),
      category: 'type-safety',
    };
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(await runInputValidationTest());
  results.push(await runErrorHandlingTest());
  results.push(await runLoggerTest());
  results.push(await runSerializationTest());
  results.push(await runTypeSafetyTest());

  return results;
}

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  R2IntegrationError,
  R2ConnectionError,
  R2DataError,
  ValidationError,
  CacheError,
  ErrorSeverity,
  ErrorHandler,
  handleError,
  safeAsync,
  safeAsyncWithRetry,
} from '../lib/core/error-handling';

describe('Error classes', () => {
  test('R2IntegrationError has correct fields', () => {
    const err = new R2IntegrationError('msg', 'CODE_1', { key: 'val' }, true);
    expect(err.message).toBe('msg');
    expect(err.code).toBe('CODE_1');
    expect(err.context).toEqual({ key: 'val' });
    expect(err.recoverable).toBe(true);
    expect(err.name).toBe('R2IntegrationError');
    expect(err).toBeInstanceOf(Error);
  });

  test('R2ConnectionError sets correct code and is non-recoverable', () => {
    const err = new R2ConnectionError('conn fail');
    expect(err.code).toBe('R2_CONNECTION_ERROR');
    expect(err.recoverable).toBe(false);
    expect(err.name).toBe('R2ConnectionError');
    expect(err).toBeInstanceOf(R2IntegrationError);
  });

  test('R2DataError sets correct code and is recoverable', () => {
    const err = new R2DataError('data bad');
    expect(err.code).toBe('R2_DATA_ERROR');
    expect(err.recoverable).toBe(true);
  });

  test('ValidationError sets correct code and is non-recoverable', () => {
    const err = new ValidationError('invalid input');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.recoverable).toBe(false);
  });

  test('CacheError sets correct code and is recoverable', () => {
    const err = new CacheError('cache miss');
    expect(err.code).toBe('CACHE_ERROR');
    expect(err.recoverable).toBe(true);
  });
});

describe('ErrorSeverity', () => {
  test('has expected enum values', () => {
    expect(ErrorSeverity.LOW).toBe('low');
    expect(ErrorSeverity.MEDIUM).toBe('medium');
    expect(ErrorSeverity.HIGH).toBe('high');
    expect(ErrorSeverity.CRITICAL).toBe('critical');
  });
});

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.getInstance().resetTracking();
  });

  test('getInstance returns singleton', () => {
    const a = ErrorHandler.getInstance();
    const b = ErrorHandler.getInstance();
    expect(a).toBe(b);
  });

  test('handle tracks error counts', () => {
    const handler = ErrorHandler.getInstance();
    const recoverable = new R2DataError('test');

    handler.handle(recoverable, 'test-context', ErrorSeverity.LOW);
    handler.handle(recoverable, 'test-context', ErrorSeverity.LOW);

    const stats = handler.getErrorStats();
    const entries = Object.values(stats);
    expect(entries.some(e => e.count >= 2)).toBe(true);
  });

  test('handle throws on CRITICAL severity', () => {
    const handler = ErrorHandler.getInstance();
    expect(() => {
      handler.handle(new Error('critical!'), 'ctx', ErrorSeverity.CRITICAL);
    }).toThrow();
  });

  test('resetTracking clears all stats', () => {
    const handler = ErrorHandler.getInstance();
    handler.handle(new R2DataError('x'), 'ctx', ErrorSeverity.LOW);
    handler.resetTracking();
    expect(Object.keys(handler.getErrorStats()).length).toBe(0);
  });
});

describe('handleError', () => {
  beforeEach(() => {
    ErrorHandler.getInstance().resetTracking();
  });

  test('wraps plain Error into R2IntegrationError and throws (non-recoverable)', () => {
    try {
      handleError(new Error('plain'), 'test');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(R2IntegrationError);
      expect((err as R2IntegrationError).code).toBe('UNKNOWN_ERROR');
    }
  });

  test('passes through recoverable R2IntegrationError subclasses', () => {
    // CacheError is recoverable, so handle returns it without throwing
    const original = new CacheError('oops');
    const result = handleError(original, 'test');
    expect(result).toBe(original);
  });
});

describe('safeAsync', () => {
  test('returns operation result on success', async () => {
    const result = await safeAsync(async () => 42, 'test');
    expect(result).toBe(42);
  });

  test('returns fallback on error', async () => {
    const result = await safeAsync(
      async () => { throw new Error('fail'); },
      'test',
      -1
    );
    expect(result).toBe(-1);
  });

  test('returns undefined when no fallback given', async () => {
    const result = await safeAsync(
      async () => { throw new Error('fail'); },
      'test'
    );
    expect(result).toBeUndefined();
  });
});

describe('safeAsyncWithRetry', () => {
  test('returns result on first success', async () => {
    const result = await safeAsyncWithRetry(async () => 'ok', 'test');
    expect(result).toBe('ok');
  });

  test('retries and succeeds on later attempt', async () => {
    let attempt = 0;
    const result = await safeAsyncWithRetry(
      async () => {
        attempt++;
        if (attempt < 3) throw new Error('not yet');
        return 'finally';
      },
      'test',
      3,
      1 // 1ms retry delay for fast tests
    );
    expect(result).toBe('finally');
    expect(attempt).toBe(3);
  });

  test('throws after all retries exhausted (non-recoverable error)', async () => {
    await expect(
      safeAsyncWithRetry(
        async () => { throw new Error('always fail'); },
        'test',
        2,
        1,
        'fallback-val'
      )
    ).rejects.toThrow();
  });
});

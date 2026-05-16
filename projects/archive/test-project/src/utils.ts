import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

export function generateId(): string {
  return randomUUID();
}

export function measureTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

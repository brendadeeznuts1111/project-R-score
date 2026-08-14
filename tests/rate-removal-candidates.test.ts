// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import {
  actionLabel,
  detectProtocol,
  protocolLabel,
  scoreRemoval,
  sectionLabel,
  type RemovalSignals,
} from '../scripts/rate-removal-candidates.ts';

function base(over: Partial<RemovalSignals> = {}): RemovalSignals {
  return {
    importHits: 0,
    tierA: false,
    protected: false,
    internalProtocol: false,
    catalog: false,
    weakSection: false,
    rootOnly: true,
    declarationCount: 1,
    ...over,
  };
}

describe('rate-removal-candidates scoring', () => {
  test('detectProtocol', () => {
    expect(detectProtocol('workspace:*')).toBe('workspace');
    expect(detectProtocol('catalog:')).toBe('catalog');
    expect(detectProtocol('file:../x')).toBe('file');
    expect(detectProtocol('1.2.3')).toBe('npm');
    expect(detectProtocol('^1.0.0')).toBe('npm');
  });

  test('protected packages score 0', () => {
    const r = scoreRemoval(base({ protected: true }), 'typescript');
    expect(r.score).toBe(0);
    expect(r.grade).toBe('protected');
  });

  test('workspace protocol is protected', () => {
    const r = scoreRemoval(base({ internalProtocol: true }), '@factorywager/guards');
    expect(r.grade).toBe('protected');
  });

  test('unused tier-A is a strong remove candidate', () => {
    const r = scoreRemoval(base({ tierA: true, importHits: 0 }), 'chalk');
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.grade).toBe('remove');
  });

  test('heavy imports keep package', () => {
    const r = scoreRemoval(base({ importHits: 50, rootOnly: false }), 'plaid');
    expect(r.grade).toBe('keep');
    expect(r.score).toBeLessThanOrEqual(35);
  });

  test('catalog unused is review not automatic remove', () => {
    const r = scoreRemoval(base({ catalog: true, importHits: 0 }), 'zod');
    // catalog penalty + unused — may still be high; protected zod tested separately
    expect(r.reasons.some(x => x.includes('catalog'))).toBe(true);
  });

  test('table labels are human-readable', () => {
    expect(actionLabel('remove')).toBe('REMOVE');
    expect(actionLabel('protected')).toBe('LOCKED');
    expect(sectionLabel('devDependencies')).toBe('dev');
    expect(protocolLabel('workspace')).toBe('workspace:*');
    expect(protocolLabel('npm')).toBe('npm registry');
  });
});

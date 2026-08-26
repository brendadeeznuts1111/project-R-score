import { describe, expect, test } from 'bun:test';
import { parseExactLocalAuthority } from './runtime-authority-config.ts';

describe('Fantasy42 configured runtime authorities', () => {
  test('language hub configuration only accepts the exact local sidecar origin', () => {
    expect(() => parseExactLocalAuthority('https://attacker.example', 'language-hub')).toThrow(
      'exact http://localhost:3001'
    );
    expect(() =>
      parseExactLocalAuthority('http://localhost:3001/escaped', 'language-hub')
    ).toThrow('exact http://localhost:3001');
    expect(parseExactLocalAuthority('http://localhost:3001', 'language-hub')).toBe(
      'http://localhost:3001'
    );
  });

  test('enhanced auth test client rejects authority overrides', () => {
    expect(() => parseExactLocalAuthority('https://auth.example', 'auth-test')).toThrow(
      'exact http://localhost:8788'
    );
    expect(() =>
      parseExactLocalAuthority('http://localhost:8788/escaped', 'auth-test')
    ).toThrow('exact http://localhost:8788');
    expect(parseExactLocalAuthority('http://localhost:8788', 'auth-test')).toBe(
      'http://localhost:8788'
    );
  });
});

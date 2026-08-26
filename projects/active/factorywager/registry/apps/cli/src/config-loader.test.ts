import { describe, expect, it } from 'bun:test';
import {
  getDefaultConfig,
  mergeWithDefaults,
  validateConfig,
} from './config-loader';

describe('registry config loader planes', () => {
  it('defaults only the canonical public read plane', () => {
    const config = getDefaultConfig();
    expect(config.readUrl).toBe('https://registry.factory-wager.com/api/npm');
    expect(config.localWriteUrl).toBeUndefined();
  });

  it('keeps legacy url compatibility warning-only', () => {
    const warnings: string[] = [];
    const config = mergeWithDefaults(
      { url: 'https://write.example.com' },
      message => warnings.push(message)
    );
    expect(config.readUrl).toBe('https://registry.factory-wager.com/api/npm');
    expect(config.localWriteUrl).toBeUndefined();
    expect(warnings).toEqual([
      'Legacy config.url is ambiguous and was ignored; use readUrl or localWriteUrl explicitly',
    ]);
  });

  it('accepts an explicit local development write plane', () => {
    const config = mergeWithDefaults({ localWriteUrl: 'http://127.0.0.1:4873/' });
    expect(config.localWriteUrl).toBe('http://127.0.0.1:4873');
    expect(validateConfig(config).valid).toBe(true);
  });

  it('rejects public-read and arbitrary remote write destinations', () => {
    for (const localWriteUrl of [
      'https://registry.factory-wager.com/api/npm',
      'https://write.example.com',
    ]) {
      expect(() => mergeWithDefaults({ localWriteUrl })).toThrow(
        'credential-free HTTP loopback'
      );
    }
  });
});

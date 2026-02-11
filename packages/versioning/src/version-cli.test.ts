import { describe, expect, test } from 'bun:test';

import { parseArgsFrom } from './version-cli';

describe('parseArgsFrom', () => {
  test('parses command and core flags', () => {
    const options = parseArgsFrom([
      'register',
      '--component',
      '/api/users/v1',
      '--version',
      '1.2.3',
      '--author',
      'dev@factory-wager.com',
    ]);

    expect(options.command).toBe('register');
    expect(options.component).toBe('/api/users/v1');
    expect(options.version).toBe('1.2.3');
    expect(options.author).toBe('dev@factory-wager.com');
  });

  test('accepts valid environment and format values', () => {
    const options = parseArgsFrom([
      'report',
      '--environment',
      'staging',
      '--format',
      'json',
    ]);

    expect(options.environment).toBe('staging');
    expect(options.format).toBe('json');
  });

  test('ignores invalid environment and format values', () => {
    const options = parseArgsFrom([
      'report',
      '--environment',
      'qa',
      '--format',
      'xml',
    ]);

    expect(options.environment).toBeUndefined();
    expect(options.format).toBeUndefined();
  });
});

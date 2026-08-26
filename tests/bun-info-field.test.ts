// @see https://bun.com/docs/pm/cli/info — bun info
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  formatBunInfoFieldValue,
  parseBunInfoCli,
  resolvePackumentField,
} from '../lib/registry/bun-info-field.ts';

describe('lib/registry/bun-info-field', () => {
  test('parseBunInfoCli normalizes --registry URL (space form)', () => {
    const cli = parseBunInfoCli([
      '--registry',
      'http://127.0.0.1:3000',
      '@factorywager/registry-client',
      '--json',
    ]);
    expect(cli.registry).toBe('http://127.0.0.1:3000');
    expect(cli.pkg).toBe('@factorywager/registry-client');
    expect(cli.json).toBe(true);
  });

  test('parseBunInfoCli property path', () => {
    const cli = parseBunInfoCli(['react', 'repository.url']);
    expect(cli.pkg).toBe('react');
    expect(cli.property).toBe('repository.url');
  });

  test('parseBunInfoCli rejects duplicate registry controls', () => {
    expect(() =>
      parseBunInfoCli([
        '--registry=https://one.example',
        '--registry',
        'https://two.example',
        'react',
      ])
    ).toThrow('exactly once');
  });

  test('formatBunInfoFieldValue returns {} for null dependencies', () => {
    expect(formatBunInfoFieldValue('dependencies', null)).toBe('{}');
    expect(formatBunInfoFieldValue('peerDependencies', undefined)).toBe('{}');
  });

  test('resolvePackumentField supports dot paths', () => {
    const meta = { repository: { url: 'git+https://github.com/react/react.git' } };
    expect(resolvePackumentField(meta, 'repository.url')).toBe(
      'git+https://github.com/react/react.git'
    );
  });

});

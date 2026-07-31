// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { resolveVulnerabilityDatabasePath } from '../projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker/src/security/security-scanner.ts';
import { resolveDatabasePath as resolveShortcutDatabasePath } from '../projects/active/utilities/shortcut-registry/src/database/path.ts';

describe('root output producers', () => {
  test('shortcut registry database defaults to its owning project', () => {
    expect(resolveShortcutDatabasePath('', '')).toBe(
      resolve(
        'projects/active/utilities/shortcut-registry',
        'shortcuts.db'
      )
    );
  });

  test('shortcut registry isolates parallel Bun test workers', () => {
    expect(resolveShortcutDatabasePath('', '7')).toMatch(
      new RegExp(`factorywager-shortcut-registry-${process.pid}-7\\.db$`)
    );
  });

  test('security scanner database defaults to dashboard-worker', () => {
    expect(resolveVulnerabilityDatabasePath()).toBe(
      resolve(
        'projects/active/enterprise/fantasy42-fire22-registry/dashboard-worker',
        'vulnerabilities.db'
      )
    );
  });

  test('explicit database paths remain supported', () => {
    expect(resolveShortcutDatabasePath('./artifacts/shortcuts.db')).toBe(
      resolve('artifacts/shortcuts.db')
    );
    expect(resolveVulnerabilityDatabasePath('./artifacts/vulnerabilities.db')).toBe(
      resolve('artifacts/vulnerabilities.db')
    );
  });
});
